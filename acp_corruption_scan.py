# Cron: 0 */4 * * * /usr/bin/python3 /path/to/acp_corruption_scan.py >> /var/log/acp_scan.log 2>&1

import json
import os
import re
import sys
from datetime import datetime

try:
    import anthropic
    import requests
    from dotenv import load_dotenv
except ImportError as e:
    print(f"[{datetime.utcnow().isoformat()}] ERROR: Missing dependency: {e}")
    print("Run: pip install anthropic requests python-dotenv")
    sys.exit(1)

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
ACP_WEBHOOK_SECRET = os.getenv("ACP_WEBHOOK_SECRET")
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "https://anticorruptionparty.us/api/webhooks/corruption-scan")

def log(msg: str):
    print(f"[{datetime.utcnow().isoformat()}] {msg}", flush=True)

USER_PROMPT = """You are an investigative journalist AI working for the Anti-Corruption Party (ACP) platform at anticorruptionparty.us. Your job is to scan for recent news (last 4 hours) about political corruption in the United States. Be factual, citation-based, and politically neutral — report on corruption across all parties equally.

Search for and summarize notable findings in each of the following categories:

1. SUPER PACs & Dark Money

New SuperPAC registrations or filings with the FEC
SuperPACs with unusually large, sudden, or anonymous donations
Dark money groups with undisclosed donors influencing federal or state elections
Independent expenditure campaigns targeting or supporting specific candidates
SuperPACs with known ties to foreign nationals or foreign-connected entities
Coordination violations between campaigns and SuperPACs

2. CANDIDATES & POLITICIANS

Politicians under federal or state investigation for campaign finance violations
Candidates accepting donations from banned or foreign sources
Congressional members with suspicious stock trades near legislation votes (STOCK Act violations)
Politicians who recently reversed positions after receiving large donor contributions
Incumbents with new PAC money from industries they regulate
Newly filed FEC complaints against any candidate

3. SPECIAL INTEREST GROUPS (SIGs) & LOBBYISTS

Lobbying disclosure reports showing unusual spending spikes
Industry PACs making large bundled donations to multiple candidates simultaneously
SIGs under investigation for illegal coordination or foreign ties
Revolving door stories: former regulators joining lobbying firms or vice versa
New SIGs registered with the IRS or FEC that show signs of dark money activity
SIGs tied to foreign governments (FARA filings)

4. LEGAL CASES & INVESTIGATIONS

New DOJ, FEC, or state AG indictments or charges related to campaign finance
Ongoing corruption trials with new developments
Whistleblower disclosures related to political corruption
FOIA releases revealing donor influence on policy decisions

5. PROPAGANDA & DISINFORMATION

Coordinated inauthentic behavior by political campaigns on social media
Astroturfing campaigns funded by undisclosed donors
PAC-funded disinformation campaigns targeting voters

For each finding, return ONLY a valid JSON array with no markdown, no preamble, no backticks. Each object must have exactly these keys:

"Headline" (string)
"Category" (string, one of the 5 categories above)
"Summary" (2-3 sentences, neutral tone)
"Source URL" (string or null)
"Entities involved" (array of strings: politician names, SIG names, PAC names)
"ACP Relevance Score" (integer 1-10)
"Suggested Action" (one of: "Flag for SIG database", "Update politician grade", "Create news article", "Admin review", "Monitor")"""


def call_claude() -> list[dict]:
    if not ANTHROPIC_API_KEY:
        raise ValueError("ANTHROPIC_API_KEY is not set")

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    log("Calling Claude claude-opus-4-6 with web_search tool...")

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=4000,
        tools=[{
            "type": "web_search_20250305",
            "name": "web_search",
        }],
        messages=[{
            "role": "user",
            "content": USER_PROMPT,
        }],
    )

    raw_text = ""
    for block in message.content:
        if hasattr(block, "text"):
            raw_text += block.text

    if not raw_text.strip():
        raise ValueError("Claude returned an empty response")

    log(f"Received response ({len(raw_text)} chars). Parsing JSON...")

    stripped = re.sub(r"^```(?:json)?\s*", "", raw_text.strip())
    stripped = re.sub(r"\s*```$", "", stripped)

    findings = json.loads(stripped)
    if not isinstance(findings, list):
        raise ValueError(f"Expected a JSON array, got: {type(findings)}")

    return findings


def post_to_webhook(findings: list[dict]) -> dict:
    if not ACP_WEBHOOK_SECRET:
        raise ValueError("ACP_WEBHOOK_SECRET is not set")

    log(f"Posting {len(findings)} findings to {WEBHOOK_URL} ...")

    response = requests.post(
        WEBHOOK_URL,
        json=findings,
        headers={
            "Content-Type": "application/json",
            "x-webhook-secret": ACP_WEBHOOK_SECRET,
        },
        timeout=30,
    )

    response.raise_for_status()
    return response.json()


def main():
    log("=== ACP Corruption News Scanner starting ===")

    try:
        findings = call_claude()
        log(f"Claude returned {len(findings)} findings")
    except json.JSONDecodeError as e:
        log(f"ERROR: Failed to parse JSON from Claude response: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR: Claude API call failed: {e}")
        sys.exit(1)

    try:
        result = post_to_webhook(findings)
        log(f"Webhook response: {json.dumps(result)}")
        log(f"Summary: received={result.get('received', '?')}, highPriority={result.get('highPriority', '?')}")
    except requests.HTTPError as e:
        log(f"ERROR: Webhook HTTP error {e.response.status_code}: {e.response.text}")
        sys.exit(1)
    except requests.RequestException as e:
        log(f"ERROR: Webhook request failed: {e}")
        sys.exit(1)
    except Exception as e:
        log(f"ERROR: Unexpected error posting to webhook: {e}")
        sys.exit(1)

    log("=== Scan complete ===")


if __name__ == "__main__":
    main()
