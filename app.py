import os
import secrets
from flask import Flask, request, jsonify, render_template
from openai import OpenAI

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

# Flask app setup
app = Flask(__name__, static_folder='static', template_folder='templates')

# OpenAI client — expects OPENAI_API_KEY to be set in the environment
# macOS/Linux: export OPENAI_API_KEY="sk-..."
# Windows PS:  $env:OPENAI_API_KEY = "sk-..."
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
client = OpenAI(api_key=OPENAI_API_KEY)

# In-memory "database" (resets when the server restarts)
questions_db = {}  # { "q1": { "question": str, "opinions": [str, ...] } }
question_counter = 0


SUMMARY_MODEL = os.environ.get("SUMMARY_MODEL", "gpt-4o-mini")

# -----------------------------------------------------------------------------
# Routes (pages)
# -----------------------------------------------------------------------------

@app.route("/")
def index():
    """Landing page: create a question."""
    return render_template("index.html")

@app.route("/question/<question_id>")
def opinion_page(question_id: str):
    """Page to submit an opinion for a given question."""
    if question_id in questions_db:
        return render_template("opinion.html")
    return "Question not found.", 404

@app.route("/summary/<question_id>")
def summary_page(question_id: str):
    """Page to view/generate the summary for a question."""
    if question_id in questions_db:
        return render_template("summary.html")
    return "Question not found.", 404

# -----------------------------------------------------------------------------
# APIs (AJAX endpoints used by your JS)
# -----------------------------------------------------------------------------

@app.route("/api/create-question", methods=["POST"])
def create_question():
    """
    Create a new question.
    Expects JSON: { "question": "..." }
    Returns: { "link": "/question/q1" }
    """
    global question_counter
    data = request.get_json(silent=True) or {}
    question_text = (data.get("question") or "").strip()

    if not question_text:
        return jsonify({"error": "Question is required"}), 400

    question_counter += 1
    qid = f"q{question_counter}"
    questions_db[qid] = {"question": question_text, "opinions": []}

    return jsonify({"link": f"/question/{qid}"}), 200

@app.route("/api/question/<question_id>", methods=["GET"])
def get_question(question_id: str):
    """
    Get question text.
    Returns: { "question": "..." } or 404
    """
    q = questions_db.get(question_id)
    if not q:
        return jsonify({"error": "Question not found"}), 404
    return jsonify({"question": q["question"]}), 200

@app.route("/api/submit-opinion/<question_id>", methods=["POST"])
def submit_opinion(question_id: str):
    """
    Submit an opinion for a question.
    Expects JSON: { "opinion": "..." }
    Returns: { "success": true } or 404
    """
    q = questions_db.get(question_id)
    if not q:
        return jsonify({"error": "Question not found"}), 404

    data = request.get_json(silent=True) or {}
    opinion_text = (data.get("opinion") or "").strip()

    if not opinion_text:
        return jsonify({"error": "Opinion is required"}), 400

    # Optionally cap length to avoid huge prompts
    opinion_text = opinion_text[:4000]
    q["opinions"].append(opinion_text)
    return jsonify({"success": True}), 200

@app.route("/api/opinion-count/<question_id>", methods=["GET"])
def opinion_count(question_id: str):
    q = questions_db.get(question_id)
    if not q:
        return jsonify({"error": "Question not found"}), 404
    return jsonify({"count": len(q["opinions"])}), 200


@app.route("/api/summarize/<question_id>", methods=["GET"])
def summarize_opinions(question_id: str):
    """
    Generate a summary of opinions for a question using OpenAI.
    Returns: { "summary": "..." } (or appropriate error JSON)
    """
    q = questions_db.get(question_id)
    if not q:
        return jsonify({"error": "Question not found"}), 404

    if not OPENAI_API_KEY:
        return jsonify({"error": "Missing OPENAI_API_KEY on server"}), 500

    opinions = q["opinions"]
    question_text = q["question"]

    # Require at least 2 opinions for a useful summary
    if len(opinions) < 2:
        return jsonify({"summary": "Not enough opinions to generate a summary."}), 200

    # Build prompt (light truncation to keep payload manageable)
    clipped = [op[:2000] for op in opinions]
    opinion_lines = "\n".join(f"- {op}" for op in clipped)
    user_prompt = f"""You are an AI assistant tasked with providing a concise and honest summary of a set of anonymous opinions with a bit of (british) humour. Also provide a general sentiment (positive, negative, mixed) towards the topic asked (this should come first). 

Question:
{question_text}

Opinions:
{opinion_lines}
"""

    try:
        completion = client.chat.completions.create(
            model=SUMMARY_MODEL,  # default gpt-4o-mini
            messages=[
                {"role": "system", "content": "You help groups find signal in feedback."},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,
            max_tokens=400,
        )
        summary = completion.choices[0].message.content.strip()
        return jsonify({"summary": summary}), 200

    except Exception as e:
        # Always return JSON so the frontend can display an error
        return jsonify({"error": f"Summarization failed: {str(e)}"}), 500

# -----------------------------------------------------------------------------
# Utilities
# -----------------------------------------------------------------------------

@app.route("/healthz")
def health():
    """Simple health check."""
    return jsonify({"ok": True}), 200

# -----------------------------------------------------------------------------
# Entry point
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    # Bind to 0.0.0.0 and read PORT for PaaS environments
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)

