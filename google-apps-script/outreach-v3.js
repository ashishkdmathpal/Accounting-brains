// ================================================================
//  ACCOUNTINGBRAINS — VALUE-DRIVEN OUTREACH v3
//  
//  3-STEP PIPELINE + COST TRACKING PER EMAIL
//  
//  Step 1: llama-3.3-70b → Extract keywords
//  Step 2: groq/compound-mini → Web search
//  Step 3: llama-3.3-70b → Draft value-driven email
//  
//  Logs tokens, cost (USD + INR), model split per email
//  Dependencies: Google ecosystem + Groq API only
// ================================================================


// ============================================
// 1. CONFIGURATION
// ============================================

var CONFIG = {
  GROQ_API_KEY: null,  // Loaded from Script Properties — see getApiKey()
  
  // Primary models
  MODEL_EXTRACT: "llama-3.3-70b-versatile",
  MODEL_VISION: "meta-llama/llama-4-scout-17b-16e-instruct",
  MODEL_SEARCH: "groq/compound-mini",
  MODEL_DRAFT: "openai/gpt-oss-120b",

  // Fallback models (used automatically if primary fails)
  FALLBACK: {
    "llama-3.3-70b-versatile": "llama-3.1-8b-instant",
    "meta-llama/llama-4-scout-17b-16e-instruct": "llama-3.3-70b-versatile",
    "groq/compound-mini": "groq/compound",
    "openai/gpt-oss-120b": "openai/gpt-oss-20b"
  },

  // Second-level fallback (if first fallback also fails)
  FALLBACK_2: {
    "openai/gpt-oss-20b": "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant": null,
    "groq/compound": null
  },

  MEETING_LINK: "https://cal.com/accountingbrains/30min",
  DEFAULT_SIGNATORY: "Team AccountingBrains",

  SIGNATORIES: {
    "Ashish": { name: "Ashish", title: "Founder", phone: "+91-XXXXXXXXXX" },
    "Person2": { name: "Person2", title: "Business Development", phone: "+91-XXXXXXXXXX" },
    "Person3": { name: "Person3", title: "Client Relations", phone: "+91-XXXXXXXXXX" },
    "Team AccountingBrains": { name: "Team AccountingBrains", title: "", phone: "+91-XXXXXXXXXX" }
  },

  COMPANY_NAME: "AccountingBrains",
  COMPANY_WEBSITE: "https://accountingbrains.com",
  COMPANY_EMAIL: "contact@accountingbrains.com",
  BCC_EMAIL: "ashish@accountingbrains.com",

  USD_TO_INR: 90,

  PRICING: {
    "llama-3.3-70b-versatile": { input: 0.59, output: 0.79 },
    "llama-3.1-8b-instant": { input: 0.05, output: 0.08 },
    "meta-llama/llama-4-scout-17b-16e-instruct": { input: 0.11, output: 0.34 },
    "groq/compound-mini": { input: 0.11, output: 0.34 },
    "groq/compound": { input: 0.11, output: 0.34 },
    "openai/gpt-oss-120b": { input: 0.15, output: 0.60 },
    "openai/gpt-oss-20b": { input: 0.075, output: 0.30 },
    "search_per_call": 0.005
  },
  // Prices are per MILLION tokens ($/M)
  // Source: groq.com/pricing — Feb 2026
  // Formula: (input_tokens * input_price / 1,000,000) + (output_tokens * output_price / 1,000,000)
  // Search: $0.005 per web search call (compound-mini built-in tool)

  COL_REQUIREMENT: 2,
  COL_FILE_UPLOAD: 3,
  COL_RECIPIENT: 4,
  COL_SIGNATORY: 5,
  COL_EXTRACTED_EMAIL: 6,
  COL_SUBJECT: 7,
  COL_BODY: 8,
  COL_STATUS: 9,
  COL_SENT_AT: 10,
  COL_SENT_BY: 11,
  COL_SEARCH_CONTEXT: 12,
  COL_STEP1_TOKENS: 13,
  COL_STEP2_TOKENS: 14,
  COL_STEP3_TOKENS: 15,
  COL_TOTAL_TOKENS: 16,
  COL_COST_USD: 17,
  COL_COST_INR: 18,
  COL_MODEL_SPLIT: 19
};


var SERVICE_KB = "=== ABOUT ACCOUNTINGBRAINS ===\n" +
  "Specialized Global Delivery Center providing outsourced accounting, bookkeeping, and fractional CFO support to businesses, CPA firms, and finance leaders across US, Canada, Australia, UK/Europe.\n" +
  "7+ years operational experience. Team: CAs, CPAs, Company Secretaries, Lawyers, MBAs, QuickBooks Pro-Advisor certified.\n" +
  "We are NOT a staffing agency. We are 'the team behind your team.'\n\n" +

  "=== SERVICES ===\n" +
  "Businesses & Non-Profits: Bookkeeping (daily/weekly/monthly), AP/AR management, payroll (941, 940, W-2, 1099), financial reporting (P&L, balance sheet, cash flow, custom), month-end close, tax prep support, non-profit fund accounting, grant tracking, Form 990.\n" +
  "CPA Firms: White-label bookkeeping, tax prep, audit support under THEIR brand. Busy season overflow (Jan-Apr, Sep-Oct, Nov-Jan). Back-office ops.\n" +
  "Fractional CFO Practices: Day-to-day bookkeeping so they focus on advisory. White-label delivery. Dedicated team per client with SPOC model.\n\n" +

  "=== VALUE METRICS (use for ROI calculations) ===\n" +
  "40-60% cost savings vs in-house US staff.\n" +
  "Full team (bookkeeper + staff accountant + controller support): $20K-$30K/yr vs $65K-$85K+ for single US bookkeeper.\n" +
  "3-level quality review: Primary Accountant → Senior Reviewer → Quality Team.\n" +
  "Dedicated SPOC per client. US time zone alignment. Technology agnostic (QuickBooks, Xero, Sage, FreshBooks, Gusto, ADP, Bill.com, Expensify, Ramp, Fathom).\n" +
  "NDA-protected, secure cloud, encrypted communications.\n\n" +

  "=== INDUSTRY DATA POINTS (these are reference points — prefer FRESH data from web search over these) ===\n" +
  "75% of CPAs plan retirement within 15 years (CPA Practice Advisor, 2025)\n" +
  "AI adoption in accounting: 9% → 41% in one year (Wolters Kluwer, 2025)\n" +
  "F&A outsourcing market: $54.8B in 2025, projected $81.25B by 2030 (Grand View Research)\n" +
  "Fractional CFO demand up 103% (CFO Engine, 2026)\n" +
  "82% of business failures trace to poor cash flow management (U.S. Bank & SCORE)\n" +
  "Manual AP invoice: $12-$30 each; automated: $1-$5 (Corpay, 2025)\n" +
  "CPA exam candidates dropped 34% in one year (NASBA, 2024)\n" +
  "99% of accountants report burnout (CPA Trendlines)\n" +
  "73 days to fill a CPA-required role — 41% longer than non-CPA (TalentFoot)\n" +
  "300K+ accountants left the profession since 2020\n\n" +

  "=== CURRENCY & LOCALIZATION ===\n" +
  "ALWAYS use USD ($). Reference US/international standards (GAAP, IFRS). NEVER mention India-based pricing or cost arbitrage directly — focus on value delivered.\n\n" +

  "=== CONTACT ===\n" +
  "Website: accountingbrains.com | Email: contact@accountingbrains.com";


// ============================================
// 2. COST TRACKER
// ============================================

function createCostTracker() {
  return {
    step1: { input: 0, output: 0, model: CONFIG.MODEL_EXTRACT },
    step2: { input: 0, output: 0, model: CONFIG.MODEL_SEARCH, searches: 0 },
    step3: { input: 0, output: 0, model: CONFIG.MODEL_DRAFT },

    recordStep: function(stepNum, usage, didSearch, response) {
      var step = "step" + stepNum;
      if (this[step] && usage) {
        this[step].input = usage.prompt_tokens || 0;
        this[step].output = usage.completion_tokens || 0;
        if (stepNum === 2 && didSearch) this[step].searches = 1;
        // Track if fallback was used
        if (response && response._fallback) {
          this[step].model = response._usedModel;
          this[step].fallback = true;
        }
      }
    },

    getStepString: function(stepNum) {
      var s = this["step" + stepNum];
      return s.input + " in / " + s.output + " out";
    },

    getTotalTokens: function() {
      return (this.step1.input + this.step1.output) +
             (this.step2.input + this.step2.output) +
             (this.step3.input + this.step3.output);
    },

    getCostUSD: function() {
      var p = CONFIG.PRICING;
      var s1m = p[this.step1.model] || p["llama-3.3-70b-versatile"];
      var cost1 = (this.step1.input * s1m.input / 1e6) + (this.step1.output * s1m.output / 1e6);

      var s2m = p[this.step2.model] || p["groq/compound-mini"];
      var cost2 = (this.step2.input * s2m.input / 1e6) + (this.step2.output * s2m.output / 1e6) +
                  (this.step2.searches * p.search_per_call);

      var s3m = p[this.step3.model] || p["llama-3.3-70b-versatile"];
      var cost3 = (this.step3.input * s3m.input / 1e6) + (this.step3.output * s3m.output / 1e6);

      return { step1: cost1, step2: cost2, step3: cost3, total: cost1 + cost2 + cost3 };
    },

    getCostINR: function() {
      return this.getCostUSD().total * CONFIG.USD_TO_INR;
    },

    getModelSplit: function() {
      var parts = [];
      var steps = [
        { key: "step1", label: "S1" },
        { key: "step2", label: "S2" },
        { key: "step3", label: "S3" }
      ];
      for (var i = 0; i < steps.length; i++) {
        var s = this[steps[i].key];
        var modelShort = s.model.split("/").pop().replace("-versatile", "").replace("-instant", "");
        var tokens = s.input + s.output;
        var fb = s.fallback ? " ⚠️FB" : "";
        parts.push(steps[i].label + ":" + modelShort + "(" + tokens + ")" + fb);
      }
      return parts.join(" | ");
    }
  };
}


// ============================================
// 3. MAIN TRIGGER
// ============================================

function onFormSubmit(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var row = e.range.getRow();

  var requirementText = String(sheet.getRange(row, CONFIG.COL_REQUIREMENT).getValue()).trim();
  var providedEmail = String(sheet.getRange(row, CONFIG.COL_RECIPIENT).getValue()).trim();
  var signatoryName = String(sheet.getRange(row, CONFIG.COL_SIGNATORY).getValue()).trim();

  if (!signatoryName || signatoryName === "undefined" || signatoryName === "") signatoryName = CONFIG.DEFAULT_SIGNATORY;

  if (!requirementText || requirementText === "undefined") {
    sheet.getRange(row, CONFIG.COL_STATUS).setValue("SKIPPED — empty");
    return;
  }

  var tracker = createCostTracker();

  try {
    // If signatory name from form doesn't match SIGNATORIES keys,
    // create a dynamic entry so ANY name works (e.g. "Mukesh", "Priya")
    var signatory;
    if (CONFIG.SIGNATORIES[signatoryName]) {
      signatory = CONFIG.SIGNATORIES[signatoryName];
    } else {
      // Dynamic signatory: use the name from form as-is
      signatory = { name: signatoryName, title: "", phone: "" };
    }

    // ===== STEP 0: Scan business card image if attached =====
    var fileUpload = String(sheet.getRange(row, CONFIG.COL_FILE_UPLOAD).getValue()).trim();
    var cardData = null;

    if (fileUpload && fileUpload !== "" && fileUpload !== "undefined") {
      cardData = step0_scanImage(fileUpload);

      if (cardData) {
        // If email not provided in form but found on card, use it
        if ((!providedEmail || providedEmail === "undefined") && cardData.email) {
          providedEmail = cardData.email;
        }

        // Enrich requirement text with card details for better personalization
        var cardContext = "\n\n[BUSINESS CARD INFO] ";
        if (cardData.person_name) cardContext += "Name: " + cardData.person_name + ". ";
        if (cardData.company_name) cardContext += "Company: " + cardData.company_name + ". ";
        if (cardData.title) cardContext += "Role: " + cardData.title + ". ";
        if (cardData.website) cardContext += "Website: " + cardData.website + ". ";
        if (cardData.other_details) cardContext += "Other: " + cardData.other_details + ". ";
        requirementText += cardContext;

        Logger.log("Card scanned: " + JSON.stringify(cardData));
      }
    }

    var s1 = step1_extractKeywords(requirementText);
    tracker.recordStep(1, s1.usage, false, s1);

    var s2 = step2_webSearch(s1.content);
    tracker.recordStep(2, s2.usage, true, s2);
    sheet.getRange(row, CONFIG.COL_SEARCH_CONTEXT).setValue(s2.content.substring(0, 1000));

    var s3 = step3_draftEmail(requirementText, providedEmail, signatory.name, s1.content, s2.content);
    tracker.recordStep(3, s3.usage, false, s3);

    var parsed = parseAiResponse(s3.content);
    if (!parsed) {
      sheet.getRange(row, CONFIG.COL_STATUS).setValue("FAILED — bad AI response");
      sheet.getRange(row, CONFIG.COL_BODY).setValue(s3.content);
      logCosts(sheet, row, tracker);
      return;
    }

    var finalEmail = parsed.recipient_email || providedEmail || "";
    var subject = parsed.subject || "Quick note";
    var body = repairHtml((parsed.body || "")
      .replace(/\[MEETING_LINK\]/g,
        '<a href="' + CONFIG.MEETING_LINK + '" style="color:#0D9B6A;text-decoration:underline;font-weight:bold;">book a quick call</a>')
      .replace(/https?:\/\/calendly\.com\/[^\s"'<)]+/g, CONFIG.MEETING_LINK));

    sheet.getRange(row, CONFIG.COL_EXTRACTED_EMAIL).setValue(finalEmail);
    sheet.getRange(row, CONFIG.COL_SUBJECT).setValue(subject);
    sheet.getRange(row, CONFIG.COL_BODY).setValue(stripHtml(body));
    sheet.getRange(row, CONFIG.COL_SENT_BY).setValue(signatoryName);

    if (isValidEmail(finalEmail)) {
      var signature = buildSignature(signatory);
      GmailApp.sendEmail(finalEmail, subject, stripHtml(body) + "\n\n" + stripHtml(signature), {
        htmlBody: formatEmail(body, signature, signatory.name),
        name: signatory.name,
        replyTo: CONFIG.COMPANY_EMAIL,
        bcc: CONFIG.BCC_EMAIL
      });
      sheet.getRange(row, CONFIG.COL_STATUS).setValue("SENT");
      sheet.getRange(row, CONFIG.COL_SENT_AT).setValue(new Date());
    } else {
      sheet.getRange(row, CONFIG.COL_STATUS).setValue("NO EMAIL — add in col F & run resend");
    }

    logCosts(sheet, row, tracker);

  } catch (error) {
    sheet.getRange(row, CONFIG.COL_STATUS).setValue("ERROR: " + error.message);
    logCosts(sheet, row, tracker);
    Logger.log("Row " + row + ": " + error.toString());
  }
}


function logCosts(sheet, row, tracker) {
  var costs = tracker.getCostUSD();
  sheet.getRange(row, CONFIG.COL_STEP1_TOKENS).setValue(tracker.getStepString(1));
  sheet.getRange(row, CONFIG.COL_STEP2_TOKENS).setValue(tracker.getStepString(2));
  sheet.getRange(row, CONFIG.COL_STEP3_TOKENS).setValue(tracker.getStepString(3));
  sheet.getRange(row, CONFIG.COL_TOTAL_TOKENS).setValue(tracker.getTotalTokens());
  sheet.getRange(row, CONFIG.COL_COST_USD).setValue("$" + costs.total.toFixed(6));
  sheet.getRange(row, CONFIG.COL_COST_INR).setValue("₹" + tracker.getCostINR().toFixed(4));
  sheet.getRange(row, CONFIG.COL_MODEL_SPLIT).setValue(tracker.getModelSplit());
}


// ============================================
// PIPELINE STEPS
// ============================================

// STEP 0: Scan business card image if attached
function step0_scanImage(fileUrl) {
  // Google Forms stores uploads as Drive file links
  // Extract file ID from various URL formats
  var fileId = "";
  if (fileUrl.indexOf("id=") > -1) {
    fileId = fileUrl.split("id=")[1].split("&")[0];
  } else if (fileUrl.indexOf("/d/") > -1) {
    fileId = fileUrl.split("/d/")[1].split("/")[0];
  } else if (fileUrl.indexOf("open?") > -1) {
    fileId = fileUrl.split("id=")[1].split("&")[0];
  }

  if (!fileId) {
    Logger.log("Could not extract file ID from: " + fileUrl);
    return null;
  }

  try {
    // Get the file from Drive and make it temporarily accessible
    var file = DriveApp.getFileById(fileId);
    var blob = file.getBlob();
    var contentType = blob.getContentType();

    // Only process images
    if (contentType.indexOf("image") === -1) {
      Logger.log("Not an image file: " + contentType);
      return null;
    }

    // Convert to base64
    var base64 = Utilities.base64Encode(blob.getBytes());
    var dataUrl = "data:" + contentType + ";base64," + base64;

    // Vision prompt
    var visionPrompt = "This is a business card image. Extract ALL information from it. Return JSON only:\n" +
      '{"person_name":"","email":"","phone":"","company_name":"","title":"","website":"","address":"","other_details":"any other text on the card"}\n' +
      "If a field is not visible, leave it empty. Be precise with email addresses.";

    // Try primary vision model, then fallback
    var visionModels = [CONFIG.MODEL_VISION];
    if (CONFIG.FALLBACK[CONFIG.MODEL_VISION]) {
      visionModels.push(CONFIG.FALLBACK[CONFIG.MODEL_VISION]);
    }

    var content = null;
    var usage = { prompt_tokens: 0, completion_tokens: 0 };

    for (var v = 0; v < visionModels.length; v++) {
      var vModel = visionModels[v];

      // Only vision-capable models can take image input
      var isVisionModel = (vModel.indexOf("llama-4") > -1);

      var messages;
      if (isVisionModel) {
        messages = [{
          role: "user",
          content: [
            { type: "text", text: visionPrompt },
            { type: "image_url", image_url: { url: dataUrl } }
          ]
        }];
      } else {
        // Fallback model can't see images — skip scan gracefully
        Logger.log("Fallback model " + vModel + " has no vision. Skipping card scan.");
        return null;
      }

      var payload = {
        model: vModel,
        messages: messages,
        temperature: 0.2,
        max_tokens: 300
      };

      var options = {
        method: "post",
        contentType: "application/json",
        headers: { "Authorization": "Bearer " + getApiKey() },
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      // Retry loop (2 attempts per model)
      for (var attempt = 0; attempt < 2; attempt++) {
        try {
          var response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", options);
          var httpCode = response.getResponseCode();
          var json = JSON.parse(response.getContentText());

          if (httpCode === 429 || httpCode === 503) {
            Logger.log("Vision API rate limit/overloaded (HTTP " + httpCode + "). Waiting 5s...");
            Utilities.sleep(5000);
            continue;
          }

          if (httpCode === 200 && !json.error) {
            content = json.choices[0].message.content;
            usage = json.usage || usage;
            break;
          } else {
            Logger.log("Vision API error [" + vModel + "]: " + (json.error ? json.error.message : httpCode));
            break; // Don't retry on non-retryable errors, try fallback model
          }
        } catch (fetchErr) {
          Logger.log("Vision fetch error [" + vModel + "]: " + fetchErr.toString());
          break;
        }
      }

      if (content) {
        if (v > 0) Logger.log("VISION FALLBACK SUCCESS: " + vModel);
        break;
      } else {
        Logger.log("Vision model " + vModel + " failed. " + (v < visionModels.length - 1 ? "Trying fallback..." : "No more fallbacks."));
        Utilities.sleep(2000);
      }
    }

    if (!content) return null;

    // Parse the extracted data
    var parsed = parseAiResponse(content);
    if (parsed) {
      parsed._usage = usage;
      return parsed;
    }
    return null;

  } catch (err) {
    Logger.log("Image scan error: " + err.toString());
    return null;
  }
}

function step1_extractKeywords(requirementText) {
  var prompt = "Analyze this business requirement carefully. Extract SPECIFIC details. JSON only:\n" +
    '{"industry":"specific sub-industry e.g. freight logistics not just transport",' +
    '"company_size":"revenue or employee count if mentioned",' +
    '"pain_points":["be SPECIFIC to what they described, not generic"],' +
    '"services_needed":["map to specific accounting services"],' +
    '"email":"extract if present",' +
    '"person_name":"extract if present",' +
    '"company_name":"extract if present",' +
    '"specific_context":"any unique detail — tech stack, compliance need, growth stage, current provider issues, urgency",' +
    '"search_query":"search for: [their specific industry] + [their specific pain point] + accounting costs benchmarks 2025 2026. Be specific, not generic."}\n\n' +
    "Text: " + requirementText.substring(0, 1000);
  return callGroq(CONFIG.MODEL_EXTRACT, "Extract structured data with maximum specificity. If a detail is not mentioned, leave empty. JSON only, no markdown.", prompt, 350);
}

function step2_webSearch(keywordsJson) {
  var industry = "";
  var companySize = "";
  var painPoints = "";
  var context = "";
  var searchQuery = "";

  try {
    var kw = JSON.parse(keywordsJson.replace(/```json\s*/g, "").replace(/```/g, "").trim());
    industry = kw.industry || "business";
    companySize = kw.company_size || "";
    painPoints = Array.isArray(kw.pain_points) ? kw.pain_points.join(", ") : (kw.pain_points || "");
    context = kw.specific_context || "";
    searchQuery = kw.search_query || (industry + " accounting costs 2025");
  } catch (e) {
    industry = "business";
    searchQuery = "accounting outsourcing costs benchmarks 2025";
  }

  var prompt = "I need REAL, CURRENT data to write a personalized email to a " + industry + " company" +
    (companySize ? " (" + companySize + ")" : "") + ".\n\n" +

    "Search the web for: " + searchQuery + "\n\n" +

    "Find and return ALL of the following with EXACT numbers and source names:\n\n" +

    "1. SALARY DATA: What does a " + industry + " company pay for accounting staff in the US right now? " +
    "(bookkeeper salary, controller salary, CFO salary — cite BLS, Robert Half, Glassdoor, or Indeed)\n\n" +

    "2. INDUSTRY-SPECIFIC COSTS: What are the typical accounting/finance costs for " + industry + " companies? " +
    "(as % of revenue, per-employee, or total annual — cite any named source)\n\n" +

    "3. PAIN POINTS: What specific financial challenges do " + industry + " companies face RIGHT NOW? " +
    (painPoints ? "(Their stated issues: " + painPoints + ") " : "") +
    "(cite industry reports, surveys, or news articles from 2025-2026)\n\n" +

    "4. OUTSOURCING TREND: Any data on " + industry + " companies outsourcing accounting or finance functions? " +
    "(market size, growth rate, adoption % — cite Grand View Research, Deloitte, McKinsey, or similar)\n\n" +

    "5. REGULATORY/COMPLIANCE: Any current regulatory changes or compliance requirements affecting " + industry + " financial management?\n\n" +

    (context ? "6. SPECIFIC CONTEXT: Also research: " + context + "\n\n" : "") +

    "RULES:\n" +
    "- Every data point MUST have a specific number ($ amount, %, time)\n" +
    "- Every data point MUST name the source (e.g. 'Robert Half 2025 Salary Guide', 'BLS 2025')\n" +
    "- If you can't find industry-specific data, find the closest adjacent industry\n" +
    "- ONLY use 2025 or 2026 data. Never cite anything from 2024 or older.\n" +
    "- Return 300-400 words of dense, factual data. No filler sentences.\n" +
    "- Format: '[FACT] — Source: [Name, Year]' for each data point";

  return callGroq(CONFIG.MODEL_SEARCH,
    "You are a financial research analyst. Your job is to find REAL, VERIFIABLE, CURRENT numbers with named sources. " +
    "Generic statements like 'accounting is important' are worthless. Only return specific $ amounts, percentages, " +
    "and time metrics with the exact source name and year. If data doesn't exist, say so — never make up numbers.",
    prompt, 800);
}

function step3_draftEmail(requirementText, providedEmail, signatoryName, keywordsJson, searchInsights) {
  var emailInstruction = (providedEmail && providedEmail !== "undefined")
    ? "Recipient email: " + providedEmail
    : "Extract email from text if present. If not found, set recipient_email to empty string.";

  var systemPrompt = "You are " + signatoryName + " from AccountingBrains. You write emails that position AccountingBrains as a STRATEGIC FINANCE PARTNER — not a backend accounting vendor or low-cost outsourcing shop.\n\n" +

    "=== ABOUT ACCOUNTINGBRAINS ===\n" +
    "AccountingBrains partners with founders as a strategic finance function.\n" +
    "7+ years, serving US/Canada/Australia/UK businesses.\n" +
    "Team: CAs, CPAs, Company Secretaries, Lawyers, MBAs, QuickBooks Pro-Advisor certified. 3-level quality review.\n\n" +
    "We build:\n" +
    "• Decision dashboards\n" +
    "• Forward-looking forecasts\n" +
    "• Margin intelligence systems\n" +
    "• AI-enabled reporting automation\n" +
    "• Scalable financial architecture\n\n" +
    "Services: Bookkeeping, AP/AR, payroll, month-end close, financial reporting, tax prep support, non-profit fund accounting, fractional CFO support, white-label for CPA firms.\n" +
    "Technology agnostic: QuickBooks, Xero, Sage, FreshBooks, Gusto, ADP, Bill.com, Expensify, Ramp, Fathom.\n\n" +

    "=== RESEARCH ON PROSPECT'S INDUSTRY ===\n" + searchInsights.substring(0, 1500) + "\n\n" +

    "=== CRITICAL RULES ===\n\n" +

    "1. NO PRICING IN FIRST EMAIL. Never mention dollar amounts, salary comparisons, cost savings percentages, or AccountingBrains pricing. Pricing appears ONLY in follow-up emails or when requested.\n\n" +

    "2. FOUNDER-LEVEL PAIN FRAMING. Focus on strategic pain points that keep founders up at night — not hiring costs or bookkeeper salaries. Select 2-3 pain points specific to their industry:\n" +
    "   • Service firms: Margin leakage across projects, revenue growing but profit stagnating, limited real-time visibility into profitability\n" +
    "   • E-commerce: Inventory blind spots, multi-channel reconciliation chaos, cash conversion cycle too long\n" +
    "   • SaaS: Burn rate opacity, revenue recognition complexity, board reporting gaps\n" +
    "   • Manufacturing: Cost allocation confusion, WIP tracking gaps, compliance burden\n" +
    "   • Non-profit: Fund accounting complexity, grant tracking overhead, Form 990 stress\n" +
    "   • CPA firms: Busy season overflow, white-label delivery gaps, client churn from slow turnaround\n" +
    "   • General: Reactive reporting instead of forward forecasting, founder time spent reviewing numbers instead of driving strategy, financial surprises\n\n" +

    "3. STRATEGIC POSITIONING. AccountingBrains is NOT a bookkeeping vendor. Frame as: 'We partner with founders to design scalable finance systems — dashboards, forecasting models, and AI-enabled reporting — that support long-term growth.'\n\n" +

    "4. NO EXTERNAL SURVEY STATISTICS. Do NOT cite 'PwC survey says...', 'Robert Half reports...', 'BLS data shows...'. These make the email feel templated. Instead, use SHORT OBSERVATIONAL INSIGHTS that show you understand their world. Example: 'At this stage, companies often find that hiring alone doesn\\'t solve visibility and forecasting gaps.'\n\n" +

    "=== 6-BLOCK EMAIL STRUCTURE (follow strictly) ===\n\n" +

    "BLOCK 1 — CONTEXT (Hi + Observational opener):\n" +
    "- ALWAYS start with 'Hi [Name],' on its own line if person name is known\n" +
    "- Then 1-2 sentences of observational context about their company/situation\n" +
    "- Pattern: 'Noticed {{Company}} is [doing X]. At this stage, companies often find that [insight about their pain].'\n" +
    "- Reference their company name. Show you've looked at them specifically.\n" +
    "- If you know their industry situation from the research, weave it in naturally — but do NOT cite the source.\n\n" +

    "BLOCK 2 — PAIN (2-3 founder-level pain points):\n" +
    "- Short intro line: 'Many growing [industry] firms face:' or 'Founders at this stage often deal with:'\n" +
    "- Then 2-3 pain points as short bullet lines. Use this HTML format:\n" +
    "  <p style='margin:0 0 6px 0;padding-left:16px;'>• Limited real-time visibility into cash and margins</p>\n" +
    "  <p style='margin:0 0 6px 0;padding-left:16px;'>• Reactive reporting instead of forward forecasting</p>\n" +
    "  <p style='margin:0 0 16px 0;padding-left:16px;'>• Founder time spent reviewing numbers instead of driving strategy</p>\n" +
    "- Pain points must be SPECIFIC to their industry. Do not use generic business pain.\n\n" +

    "BLOCK 3 — STRATEGIC POSITIONING (1 paragraph):\n" +
    "- Position AccountingBrains as a strategic partner, NOT a vendor\n" +
    "- Pattern: 'AccountingBrains partners with founders as a strategic finance function — building financial architecture that enables sustainable impact and scalable growth.'\n" +
    "- Keep it to 1-2 sentences. Authoritative, not salesy.\n\n" +

    "BLOCK 4 — CAPABILITIES (what we build):\n" +
    "- Short intro: 'We design:' or 'What this looks like in practice:'\n" +
    "- 3-4 capability bullets using this HTML format:\n" +
    "  <p style='margin:0 0 6px 0;padding-left:16px;'>• Decision dashboards</p>\n" +
    "  <p style='margin:0 0 6px 0;padding-left:16px;'>• Cash flow forecasting models</p>\n" +
    "  <p style='margin:0 0 6px 0;padding-left:16px;'>• Margin optimization frameworks</p>\n" +
    "  <p style='margin:0 0 16px 0;padding-left:16px;'>• AI-driven reporting systems</p>\n" +
    "- Tailor capabilities to their industry (e.g. for e-commerce add 'Multi-channel reconciliation', for non-profit add 'Fund accounting & grant tracking')\n\n" +

    "BLOCK 5 — TRANSFORMATION OUTCOMES (1 paragraph):\n" +
    "- Pattern: 'Our clients gain clarity, predictability, and faster decision cycles without the overhead of building and managing an internal finance team.'\n" +
    "- Or mention specific outcomes: faster reporting cycles, clear runway visibility, reduced financial surprises, 10+ hours/month of executive bandwidth recovered\n" +
    "- Keep it to 1-2 sentences. Results-focused.\n\n" +

    "BLOCK 6 — CTA:\n" +
    "- Natural, conversational close\n" +
    "- Pattern: 'If useful, I\\'d be glad to share a 15-minute walkthrough tailored to {{Company}}.'\n" +
    "- Then on next line: 'You can [MEETING_LINK] or explore more at www.accountingbrains.com.'\n" +
    "- The [MEETING_LINK] placeholder MUST be embedded in the sentence\n" +
    "- NEVER invent or hardcode any URL (no calendly.com, no acuity, no hubspot links). Only use [MEETING_LINK] — it will be replaced automatically.\n" +
    "- Do NOT end with any sign-off (no 'Best,' no 'Regards,' no name). Signature is auto-appended.\n\n" +

    "=== FORMATTING RULES ===\n" +
    "- Use <p style='margin:0 0 16px 0;'> for paragraphs\n" +
    "- Use <p style='margin:0 0 6px 0;padding-left:16px;'> for bullet lines\n" +
    "- Last bullet in each group: use margin:0 0 16px 0 (extra bottom spacing)\n" +
    "- Do NOT bold anything unless it's a capability name or transformation metric\n" +
    "- Write like a real person — warm, direct, no jargon\n\n" +

    "=== SUBJECT LINE RULES ===\n" +
    "- Pattern: 'Strengthening Financial Clarity at {{Company}}' or 'A thought on {{Company}}\\'s finance architecture'\n" +
    "- Under 8 words. Reference their company name.\n" +
    "- NEVER include percentages, 'Cut', 'Slash', 'Save', 'Reduce', 'Cost'\n" +
    "- Should sound like a colleague, not a sales pitch\n\n" +

    "=== FORBIDDEN ===\n" +
    "- Any pricing, dollar amounts, salary data, or cost comparisons in this first outreach email\n" +
    "- Any external survey citations (PwC, Robert Half, BLS, Deloitte, etc.)\n" +
    "- 'I hope this email finds you well', 'leverage', 'synergy', 'excited to connect', 'I came across', 'game-changer', 'seamless', 'robust', 'delighted', 'affordable rates', 'cheap', 'budget-friendly'\n" +
    "- Starting with a generic statistic\n" +
    "- INR or any mention of India";

  var userPrompt = "PROSPECT REQUIREMENT:\n" + requirementText.substring(0, 1000) + "\n\n" +
    "EXTRACTED CONTEXT:\n" + keywordsJson.substring(0, 600) + "\n\n" +
    emailInstruction + "\n\n" +
    "Write the email now. Use this EXACT output format (three sections separated by the markers):\n\n" +
    "===RECIPIENT_EMAIL===\n" +
    "(the email address, or empty if not known)\n" +
    "===SUBJECT===\n" +
    "(subject line)\n" +
    "===BODY===\n" +
    "(full HTML email body using <p> tags with inline styles)\n\n" +
    "Output ONLY the above format. No other text before or after.";

  return callGroq(CONFIG.MODEL_DRAFT, systemPrompt, userPrompt, 2000);
}


// ============================================
// GROQ API — Returns content + usage
// ============================================

// Loads API key from Script Properties (secure, not in code)
// Setup: Apps Script → Project Settings → Script Properties → Add "GROQ_API_KEY"
function getApiKey() {
  if (!CONFIG.GROQ_API_KEY) {
    CONFIG.GROQ_API_KEY = PropertiesService.getScriptProperties().getProperty("GROQ_API_KEY");
    if (!CONFIG.GROQ_API_KEY) {
      throw new Error("GROQ_API_KEY not found in Script Properties. Go to Project Settings → Script Properties → Add it.");
    }
  }
  return CONFIG.GROQ_API_KEY;
}


function callGroq(model, systemPrompt, userPrompt, maxTokens) {
  // Build fallback chain: primary → fallback 1 → fallback 2
  var modelsToTry = [model];
  if (CONFIG.FALLBACK[model]) {
    modelsToTry.push(CONFIG.FALLBACK[model]);
    var fb2 = CONFIG.FALLBACK_2[CONFIG.FALLBACK[model]];
    if (fb2) modelsToTry.push(fb2);
  }

  var lastError = null;

  for (var m = 0; m < modelsToTry.length; m++) {
    var currentModel = modelsToTry[m];
    if (m > 0) {
      Logger.log("FALLBACK " + m + ": " + modelsToTry[m - 1] + " failed. Trying " + currentModel + "...");
    }

    try {
      var result = _callGroqSingle(currentModel, systemPrompt, userPrompt, maxTokens);
      if (m > 0) {
        result._fallback = true;
        result._originalModel = model;
        result._usedModel = currentModel;
        result._fallbackLevel = m;
        Logger.log("FALLBACK SUCCESS (level " + m + "): " + currentModel + " worked.");
      }
      return result;
    } catch (err) {
      lastError = err;
      Logger.log("Model " + currentModel + " failed: " + err.message);
      if (m < modelsToTry.length - 1) Utilities.sleep(3000);
    }
  }

  // All models in chain failed
  throw lastError;
}


function _callGroqSingle(model, systemPrompt, userPrompt, maxTokens) {
  var payload = {
    model: model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.65,
    max_tokens: maxTokens || 500
  };

  // GPT-OSS: disable reasoning tokens
  if (model.indexOf("gpt-oss") > -1) {
    payload.include_reasoning = false;
  }

  // JSON mode: only for models that reliably support it
  var useJsonMode = (
    model !== "groq/compound-mini" &&
    model !== "groq/compound" &&
    model.indexOf("llama-4") === -1 &&
    model.indexOf("gpt-oss") === -1
  );
  if (useJsonMode) {
    payload.response_format = { type: "json_object" };
  }

  var options = {
    method: "post",
    contentType: "application/json",
    headers: { "Authorization": "Bearer " + getApiKey() },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  // Retry once on 429 (rate limit) or 503 (overloaded)
  var response, httpCode, json;
  for (var attempt = 0; attempt < 2; attempt++) {
    response = UrlFetchApp.fetch("https://api.groq.com/openai/v1/chat/completions", options);
    httpCode = response.getResponseCode();
    
    try {
      json = JSON.parse(response.getContentText());
    } catch (parseErr) {
      Logger.log("Groq response not valid JSON. HTTP " + httpCode + ". Raw: " + response.getContentText().substring(0, 500));
      throw new Error("Groq [" + model + "] returned non-JSON response (HTTP " + httpCode + ")");
    }

    if (httpCode === 429 || httpCode === 503) {
      Logger.log("Groq rate limit/overloaded (HTTP " + httpCode + "). Waiting 5s before retry...");
      Utilities.sleep(5000);
      continue;
    }
    break;
  }

  if (httpCode !== 200 || json.error) {
    var errMsg = json.error ? (json.error.message || JSON.stringify(json.error)) : "Unknown error";
    throw new Error("Groq [" + model + "] " + httpCode + ": " + errMsg);
  }

  var content = json.choices[0].message.content;
  Logger.log("Groq [" + model + "] success. Tokens: " + (json.usage ? json.usage.total_tokens : "unknown"));
  
  return {
    content: content,
    usage: json.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
  };
}


// ============================================
// HELPERS
// ============================================

function buildSignature(signatory) {
  return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1A2B3C;border-top:2px solid #0D9B6A;padding-top:14px;margin-top:28px;">' +
    '<a href="' + CONFIG.COMPANY_WEBSITE + '" style="color:#0D9B6A;text-decoration:none;font-weight:bold;">AccountingBrains.com</a><br>' +
    '<a href="' + CONFIG.MEETING_LINK + '" style="display:inline-block;margin-top:8px;padding:8px 18px;background-color:#0D9B6A;color:#ffffff;text-decoration:none;border-radius:4px;font-size:13px;font-weight:bold;">Book a Call</a></div>';
}

function parseAiResponse(text) {
  if (!text) return null;
  
  // ---- METHOD 1: Marker format (===RECIPIENT_EMAIL=== / ===SUBJECT=== / ===BODY===) ----
  if (text.indexOf("===SUBJECT===") > -1 || text.indexOf("===BODY===") > -1) {
    var result = { recipient_email: "", subject: "", body: "" };
    
    // Extract email
    var emailMatch = text.match(/===RECIPIENT_EMAIL===\s*([\s\S]*?)(?====SUBJECT===)/);
    if (emailMatch) result.recipient_email = emailMatch[1].trim();
    
    // Extract subject
    var subjectMatch = text.match(/===SUBJECT===\s*([\s\S]*?)(?====BODY===)/);
    if (subjectMatch) result.subject = subjectMatch[1].trim();
    
    // Extract body (everything after ===BODY===)
    var bodyMatch = text.match(/===BODY===\s*([\s\S]*)/);
    if (bodyMatch) result.body = bodyMatch[1].trim();
    
    if (result.body) return result;
  }
  
  // ---- METHOD 2: JSON format (for Step 1 and other models) ----
  var cleaned = text
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();
  
  try { return JSON.parse(cleaned); } catch (e) { /* continue */ }
  
  // Extract JSON block
  var jsonMatch = cleaned.match(/\{[\s\S]*"body"[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch (e) { /* continue */ }
  }
  
  var firstBrace = cleaned.indexOf("{");
  var lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace > -1 && lastBrace > firstBrace) {
    try { return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1)); } catch (e) { /* continue */ }
  }

  Logger.log("Parse failed for all methods. Raw text: " + text.substring(0, 500));
  return null;
}

function isValidEmail(email) {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function stripHtml(html) {
  if (!html) return "";
  return html.replace(/&bull;/g, "- ").replace(/<br\s*\/?>/g, "\n").replace(/<\/p>/g, "\n\n").replace(/<[^>]*>/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

// Repair truncated HTML from AI output (e.g. cut off mid-tag)
function repairHtml(html) {
  if (!html) return "";
  // Remove any incomplete tag at the end (e.g. "<p style='margin:0...")
  html = html.replace(/<[^>]*$/, '');
  // Close any unclosed <p> or <div> tags
  var openP = (html.match(/<p[\s>]/gi) || []).length;
  var closeP = (html.match(/<\/p>/gi) || []).length;
  for (var i = 0; i < openP - closeP; i++) html += '</p>';
  var openDiv = (html.match(/<div[\s>]/gi) || []).length;
  var closeDiv = (html.match(/<\/div>/gi) || []).length;
  for (var j = 0; j < openDiv - closeDiv; j++) html += '</div>';
  return html;
}

function formatEmail(bodyHtml, signatureHtml, signatoryName) {
  var signoff = '<p style="margin:24px 0 0 0;font-size:14px;color:#1A2B3C;">Best Regards,<br>' + (signatoryName || 'Team AccountingBrains') + '</p>';
  return '<div style="font-family:Arial,sans-serif;font-size:14px;color:#1A2B3C;line-height:1.6;max-width:600px;">' + bodyHtml + signoff + signatureHtml + '</div>';
}


// ============================================
// MANUAL RESEND
// ============================================

function resendFailed() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  var resent = 0;
  for (var row = 2; row <= lastRow; row++) {
    var status = String(sheet.getRange(row, CONFIG.COL_STATUS).getValue());
    if (status.indexOf("NO EMAIL") > -1) {
      var email = String(sheet.getRange(row, CONFIG.COL_EXTRACTED_EMAIL).getValue()).trim();
      var subject = String(sheet.getRange(row, CONFIG.COL_SUBJECT).getValue()).trim();
      var body = String(sheet.getRange(row, CONFIG.COL_BODY).getValue()).trim();
      var sn = String(sheet.getRange(row, CONFIG.COL_SENT_BY).getValue()).trim() || CONFIG.DEFAULT_SIGNATORY;
      var sig = CONFIG.SIGNATORIES[sn] || CONFIG.SIGNATORIES[CONFIG.DEFAULT_SIGNATORY];
      if (isValidEmail(email) && subject && body) {
        try {
          var signature = buildSignature(sig);
          GmailApp.sendEmail(email, subject, body, {
            htmlBody: formatEmail("<p>" + body.replace(/\n/g, "<br>") + "</p>", signature, sig.name),
            name: sig.name, replyTo: CONFIG.COMPANY_EMAIL, bcc: CONFIG.BCC_EMAIL
          });
          sheet.getRange(row, CONFIG.COL_STATUS).setValue("SENT (resend)");
          sheet.getRange(row, CONFIG.COL_SENT_AT).setValue(new Date());
          resent++;
        } catch (err) { sheet.getRange(row, CONFIG.COL_STATUS).setValue("RESEND FAILED: " + err.message); }
      }
    }
  }
  SpreadsheetApp.getUi().alert(resent > 0 ? resent + " email(s) resent!" : "No emails to resend.");
}


// ============================================
// SETUP & TEST
// ============================================

function setupTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "onFormSubmit") ScriptApp.deleteTrigger(triggers[i]);
  }
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(SpreadsheetApp.getActiveSpreadsheet()).onFormSubmit().create();
  SpreadsheetApp.getUi().alert("Trigger active! Token & cost tracking enabled in columns M-S.");
}

function testFullPipeline() {
  var tracker = createCostTracker();
  try {
    var testReq = "Mid-sized e-commerce company in Texas, $3M revenue. Bookkeeper quit, 3 months backlog. " +
      "Need reconciliation, AP/AR, QuickBooks cleanup. Contact: john@texaswidgets.com";
    var s1 = step1_extractKeywords(testReq); tracker.recordStep(1, s1.usage, false, s1);
    var s2 = step2_webSearch(s1.content); tracker.recordStep(2, s2.usage, true, s2);
    var s3 = step3_draftEmail(testReq, "john@texaswidgets.com", "Ashish", s1.content, s2.content);
    tracker.recordStep(3, s3.usage, false, s3);
    var costs = tracker.getCostUSD();
    SpreadsheetApp.getUi().alert(
      "TEST COMPLETE\n\n" +
      "Step 1: " + tracker.getStepString(1) + "\n" +
      "Step 2: " + tracker.getStepString(2) + "\n" +
      "Step 3: " + tracker.getStepString(3) + "\n" +
      "Total: " + tracker.getTotalTokens() + " tokens\n" +
      "Cost: $" + costs.total.toFixed(6) + " | ₹" + tracker.getCostINR().toFixed(4) + "\n" +
      "Split: " + tracker.getModelSplit() + "\n\n" +
      "Email:\n" + s3.content.substring(0, 400)
    );
  } catch (e) { SpreadsheetApp.getUi().alert("FAILED: " + e.message); }
}


// Test image scanning — run this to test AND to trigger Drive permission
function testImageScan() {
  // First, test with the actual URL from your sheet
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var lastRow = sheet.getLastRow();
  
  // Find the last row with a file upload
  var fileUrl = "";
  for (var row = lastRow; row >= 2; row--) {
    var val = String(sheet.getRange(row, CONFIG.COL_FILE_UPLOAD).getValue()).trim();
    if (val && val !== "" && val !== "undefined" && val.indexOf("drive.google.com") > -1) {
      fileUrl = val;
      break;
    }
  }

  if (!fileUrl) {
    SpreadsheetApp.getUi().alert("No file upload found in Column C. Submit a form with an image first.");
    return;
  }

  SpreadsheetApp.getUi().alert("Found URL: " + fileUrl + "\n\nAttempting to scan...");

  try {
    var result = step0_scanImage(fileUrl);
    if (result) {
      SpreadsheetApp.getUi().alert(
        "IMAGE SCAN SUCCESS!\n\n" +
        "Name: " + (result.person_name || "not found") + "\n" +
        "Email: " + (result.email || "not found") + "\n" +
        "Company: " + (result.company_name || "not found") + "\n" +
        "Title: " + (result.title || "not found") + "\n" +
        "Phone: " + (result.phone || "not found") + "\n" +
        "Website: " + (result.website || "not found") + "\n" +
        "Other: " + (result.other_details || "none")
      );
    } else {
      SpreadsheetApp.getUi().alert("Scan returned null. Check Execution Log for errors:\nApps Script → Executions (left sidebar)");
    }
  } catch (e) {
    SpreadsheetApp.getUi().alert("ERROR: " + e.message + "\n\nIf this is a permission error, click OK, then run this function again — it should prompt for Drive access.");
  }
}


// ============================================
// WEB APP HANDLERS (for website contact form)
// ============================================

function doPost(e) {
  try {
    // Parse incoming data (supports both JSON and form-urlencoded)
    var data;
    if (e.postData && e.postData.type === "application/json") {
      data = JSON.parse(e.postData.contents);
    } else {
      data = e.parameter;
    }

    var name = (data.name || "").trim();
    var email = (data.email || "").trim();
    var requirement = (data.requirement || "").trim();
    var signatory = (data.signatory || CONFIG.DEFAULT_SIGNATORY).trim();

    // Prepend name to requirement so the AI pipeline can personalize the email
    if (name) {
      requirement = "[Contact Name: " + name + "]\n" + requirement;
    }

    if (!requirement) {
      return ContentService.createTextOutput(JSON.stringify({ success: false, error: "Requirement is empty" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Append row to sheet
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setValue(new Date());
    sheet.getRange(newRow, CONFIG.COL_REQUIREMENT).setValue(requirement);
    sheet.getRange(newRow, CONFIG.COL_RECIPIENT).setValue(email);
    sheet.getRange(newRow, CONFIG.COL_SIGNATORY).setValue(signatory);

    // Trigger the AI pipeline on this row
    var fakeEvent = { range: sheet.getRange(newRow, 1) };
    onFormSubmit(fakeEvent);

    return ContentService.createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log("doPost error: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({ status: "ok", service: "AccountingBrains Lead Capture" }))
    .setMimeType(ContentService.MimeType.JSON);
}