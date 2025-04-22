import os
import glob
import shutil
import aspose.words as aw
import aspose.slides as slides
from fpdf import FPDF
from azure.storage.blob import BlobClient
from azure.storage.blob import BlobClient
from urllib.parse import urlparse, parse_qs

# Define local folder containing documents
LOCAL_FOLDER = "documents"
OUTPUT_FOLDER = "output"  # Ensure this folder exists

# Your Azure Blob Storage SAS URL
BLOB_SAS_URL = "https://ragapplication.blob.core.windows.net/rag?sp=racw&st=2025-02-13T06:29:35Z&se=2025-02-13T14:29:35Z&spr=https&sv=2022-11-02&sr=c&sig=SKo4msmG7Kj27ZPpzh%2Blh6GT6gGXpqHJ5fa18BtEzzk%3D"

# Ensure output folder exists
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def convert_to_pdf(input_file, output_file):
    ext = os.path.splitext(input_file)[1].lower()

    try:
        if ext in [".doc", ".docx"]:  # Convert Word to PDF
            doc = aw.Document(input_file)
            doc.save(output_file)
            print(f"Converted: {input_file} -> {output_file}")

        elif ext in [".ppt", ".pptx"]:  # Convert PPT to PDF
            with slides.Presentation(input_file) as presentation:
                presentation.save(output_file, slides.export.SaveFormat.PDF)
            print(f"Converted: {input_file} -> {output_file}")

        elif ext == ".txt":  # Convert TXT to PDF
            pdf = FPDF()
            pdf.set_auto_page_break(auto=True, margin=15)
            pdf.add_page()
            pdf.set_font("Arial", size=12)

            with open(input_file, "r", encoding="utf-8") as f:
                for line in f:
                    pdf.cell(200, 10, txt=line, ln=True)

            pdf.output(output_file)
            print(f"Converted: {input_file} -> {output_file}")

        else:
            print(f"Skipping unsupported file: {input_file}")
            return None

        return output_file

    except Exception as e:
        print(f"Error converting {input_file}: {e}")
        return None

def upload_to_blob(file_path):
    blob_name = os.path.basename(file_path)

    # Parse the base URL from the SAS URL
    parsed_url = urlparse(BLOB_SAS_URL)
    account_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    container_name = parsed_url.path.lstrip("/")
    sas_token = parsed_url.query

    # Create the BlobClient properly
    blob_client = BlobClient(account_url=account_url, container_name=container_name, blob_name=blob_name, credential=sas_token)

    try:
        with open(file_path, "rb") as data:
            blob_client.upload_blob(data, overwrite=True)
        print(f"Uploaded: {file_path} to Blob Storage")
    except Exception as e:
        print(f"Error uploading {file_path}: {e}")

def main():
    # Scan the local folder for files
    files = glob.glob(os.path.join(LOCAL_FOLDER, "*.*"))

    for file in files:
        pdf_output = os.path.join(OUTPUT_FOLDER, os.path.splitext(os.path.basename(file))[0] + ".pdf")
        
        converted_file = convert_to_pdf(file, pdf_output)
        if converted_file:
            upload_to_blob(converted_file)

if __name__ == "__main__":
    main()
