import os
import hashlib
from dotenv import load_dotenv, find_dotenv
from azure.storage.blob import BlobServiceClient
import requests
import time
import pypandoc
from docx import Document
from win32com import client

# # Ensure pandoc is installed
# pypandoc.download_pandoc()

# Load environment variables
load_dotenv(find_dotenv())

# Azure Storage details
storage_account_name = os.getenv("STORAGE_ACCOUNT_NAME")
storage_account_key = os.getenv("STORAGE_ACCOUNT_KEY")
container_name = os.getenv("CONTAINER_NAME")

# Azure Search details
search_service_url = os.getenv("AZURE_SEARCH_ENDPOINT")
indexer_name = os.getenv("AZURE_SEARCH_INDEX_NAME_TRIGGER")
api_key = os.getenv("AZURE_SEARCH_KEY")

# Local folder path
local_folder_path = os.getenv("LOCAL_FOLDER_PATH")

# Initialize Blob Service Client
blob_service_client = BlobServiceClient(
    account_url=f"https://{storage_account_name}.blob.core.windows.net/",
    credential=storage_account_key
)
container_client = blob_service_client.get_container_client(container_name)

def calculate_file_hash(file_path):
    """Calculate SHA-256 hash of the file."""
    hasher = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):  # Read in chunks
            hasher.update(chunk)
    return hasher.hexdigest()

def get_blob_hash(blob_name):
    """Get the ETag or hash of the existing blob in storage."""
    blob_client = container_client.get_blob_client(blob_name)
    try:
        properties = blob_client.get_blob_properties()
        return properties.etag  # Azure Blob ETag (versioning)
    except Exception:
        return None  # Blob does not exist

def convert_doc_to_docx(doc_path):
    """Convert a .doc file to .docx format."""
    word = client.Dispatch("Word.Application")
    doc = word.Documents.Open(doc_path)
    docx_path = doc_path + "x"
    doc.SaveAs(docx_path, FileFormat=16)  # 16 is the file format for .docx
    doc.Close()
    word.Quit()
    return docx_path

def convert_to_pdf(file_path):
    """Convert a file to PDF format."""
    file_name, file_extension = os.path.splitext(file_path)
    pdf_file_path = f"{file_name}.pdf"

    if file_extension.lower() == ".doc":
        file_path = convert_doc_to_docx(file_path)
        file_extension = ".docx"

    if file_extension.lower() == ".docx":
        doc = Document(file_path)
        doc.save(pdf_file_path)
    else:
        pypandoc.convert_file(file_path, 'pdf', outputfile=pdf_file_path)

    return pdf_file_path

def upload_file_to_blob(file_path):
    """Upload file if it’s new or updated."""
    file_name = os.path.basename(file_path)
    file_hash = calculate_file_hash(file_path)
    existing_blob_hash = get_blob_hash(file_name)

    if existing_blob_hash == file_hash:
        print(f"Skipping {file_name}, no changes detected.")
        return False
    else:
        blob_client = container_client.get_blob_client(file_name)
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)  # Overwrite if exists
        print(f"Uploaded {file_name} to Blob Storage (Updated/Created).")
        return True

def trigger_indexer():
    """Trigger Azure Cognitive Search Indexer."""
    url = f"{search_service_url}/indexers/{indexer_name}/run?api-version=2024-05-01-preview"
    headers = {"Content-Type": "application/json", "api-key": api_key}

    try:
        response = requests.post(url, headers=headers)
        if response.status_code in [202, 204]:  # 202 Accepted or 204 No Content
            print(f"✅ Indexer '{indexer_name}' triggered successfully!")
        else:
            print(f"⚠️ Failed to trigger indexer: {response.status_code}\n{response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error triggering indexer: {e}")

def check_indexer_status():
    """Check the status of the Azure Cognitive Search indexer."""
    url = f"{search_service_url}/indexers/{indexer_name}/status?api-version=2024-07-01"
    headers = {"Content-Type": "application/json", "api-key": api_key}

    try:
        response = requests.get(url, headers=headers)
        if response.status_code == 200:
            status_data = response.json()
            indexer_status = status_data.get("lastResult", {}).get("status", "Unknown")
            print(f"📌 Indexer Status: {indexer_status}")

            if indexer_status == "transientFailure":
                print(f"⚠️ Indexer '{indexer_name}' encountered a transient failure. Check logs for details.")
                print(f"🔍 Error Details: {status_data.get('lastResult', {}).get('errorMessage', 'No details available.')}")

        else:
            print(f"⚠️ Failed to fetch indexer status: {response.status_code}\n{response.text}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Error fetching indexer status: {e}")

def main():
    """Main function to upload files and trigger indexing."""
    uploaded_files = False  
    for file_name in os.listdir(local_folder_path):
        file_path = os.path.join(local_folder_path, file_name)
        if os.path.isfile(file_path):
            if file_name.lower().endswith(('.doc', '.docx', '.odt', '.rtf')):
                file_path = convert_to_pdf(file_path)
            if upload_file_to_blob(file_path):
                uploaded_files = True  

    if uploaded_files:
        trigger_indexer()
        time.sleep(10)  # Wait for indexing to start
        check_indexer_status()
    else:
        print("No new or updated files uploaded, skipping indexer trigger.")

if __name__ == "__main__":
    main()
