import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)  # Enable CORS

# Load Azure OpenAI credentials
endpoint = os.getenv("ENDPOINT_URL", "https://solveit.openai.azure.com/")
deployment = os.getenv("DEPLOYMENT_NAME", "gpt-4o")
subscription_key = os.getenv("AZURE_OPENAI_API_KEY")

# Initialize OpenAI client
client = AzureOpenAI(
    azure_endpoint=endpoint,
    api_key=subscription_key,
    api_version="2024-05-01-preview",
)

# Initialize Azure Search client
search_client = SearchClient(
    endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
    index_name=os.getenv("AZURE_SEARCH_INDEX_NAME"),
    credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_KEY")),
)

# Store chat history in memory (Resets on app restart)
chat_history = []

def get_document_context(query):
    try:
        search_results = search_client.search(
            search_text=query,
            select=["content"],
            top=2
        )
        contexts = [doc["content"] for doc in search_results]
        print(f"search::", contexts)
        return "\n".join(contexts) if contexts else None
    except Exception:
        return None

@app.route("/generate", methods=["POST"])
def generate_response():
    global chat_history  # Use the global chat history list
    try:
        data = request.get_json()
        prompt = data.get("prompt")

        if not prompt:
            return jsonify({"error": "Prompt is required"}), 400
        
        doc_context = get_document_context(prompt)

        system_content = (
          "You are an AI assistant specializing in HPSM Ticket interpretation and understanding."
            "\n🔹 **Scope of Responses:**\n"
            "- Answer queries **only within the provided knowledge** and context.\n"
            "- Do **not** generate responses beyond HPSM ticket information\n"
            "- If a query is **outside your scope**, politely refuse to answer.\n"
            "\n🔹 **Strict Security & Privacy Rules:**\n"
            "- Do **not** disclose **passwords, API keys, internal server details, or any confidential information**.\n"
            "- If a user asks for sensitive data like email ,phone number,password indireactly or directly **politely refuse to answer.**.\n"
            "- If a query appears to involve **potential security risks**, advise them that this attempt is being flagged for potential risk.\n"
            "\n🔹 **Response Style:**\n"
            "- Provide **direct** answers.\n"
            "- be polite while answering and make the user comfortable.\n"
            "- If more information is needed, ask clarifying questions instead of assuming.\n"
            "- Do not advise anything on escalation \n"
            f"\nHere is the relevant information from our documentation:\n{doc_context}"

        )

        # Append user input to chat history
        chat_history.append({"role": "user", "content": prompt})

        # Prepare chat prompt with full history
        chat_prompt = [{"role": "system", "content": system_content}] + chat_history

        def stream_response():
            completion = client.chat.completions.create(
                model=deployment,
                messages=chat_prompt,
                max_tokens=800,
                temperature=0.9,
                top_p=0.95,
                frequency_penalty=0,
                presence_penalty=0,
                stop=None,
                stream=True  # Enable streaming
            )

            response_content = ""  # Store response content
            for chunk in completion:
                if chunk.choices and chunk.choices[0].delta.content:
                    response_content += chunk.choices[0].delta.content
                    yield chunk.choices[0].delta.content  # Stream word-by-word

            # Append AI response to chat history
            chat_history.append({"role": "assistant", "content": response_content})

        return Response(stream_response(), content_type="application/json")

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route("/clear_history", methods=["POST"])
def clear_history():
    global chat_history
    chat_history = []  # Reset chat history
    return jsonify({"message": "Chat history cleared successfully."}), 200

if __name__ == "__main__":
    app.run(debug=True)
