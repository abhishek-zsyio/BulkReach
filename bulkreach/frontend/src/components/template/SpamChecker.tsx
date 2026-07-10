/**
 * SpamChecker — SpamAssassin-style email analysis panel.
 * Runs entirely client-side — no backend required.
 */

import { useMemo } from "react";
import {
  AlertTriangle, CheckCircle, XCircle, Shield, Link, MessageSquare,
  AlignLeft, Eye, Hash, Zap
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────
interface SpamIssue {
  id: string;
  severity: "error" | "warn" | "info";
  message: string;
  detail?: string;
  score: number; // positive = spam contribution
}

interface SpamResult {
  issues: SpamIssue[];
  totalScore: number;   // 0-10
  grade: "excellent" | "good" | "caution" | "danger";
}

// ─── Spam Trigger Words ──────────────────────────────────────────────
const SPAM_WORDS = [
  // High risk
  "free", "guaranteed", "winner", "prize", "cash", "earn money",
  "make money", "credit card", "casino", "click here", "unlimited",
  "no cost", "100%", "risk free", "act now", "limited time",
  "special offer", "exclusive deal", "lowest price", "best price",
  "buy now", "order now", "subscribe", "unsubscribe", "opt in",
  // Medium risk
  "congratulations", "pre-approved", "urgent", "important",
  "opportunity", "million", "billion", "profit", "investment",
  "income", "work from home", "extra income", "financial freedom",
  "increase sales", "double", "triple", "promise",
];

// ─── Analyzer Function ───────────────────────────────────────────────
function analyzeSpam(subject: string, htmlBody: string): SpamResult {
  const issues: SpamIssue[] = [];
  const textContent = htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const lowerText = textContent.toLowerCase();
  const lowerSubject = subject.toLowerCase();

  // ── Subject checks ────────────────────────────────────────────────

  // All caps subject
  const subjectWords = subject.trim().split(/\s+/);
  const capsWords = subjectWords.filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
  if (capsWords.length >= 2) {
    issues.push({
      id: "subject-allcaps",
      severity: "error",
      message: "Subject has ALL CAPS words",
      detail: `Words in all caps: ${capsWords.join(", ")} — triggers spam filters heavily.`,
      score: 2.0,
    });
  }

  // Excessive exclamation marks in subject
  const subjectExclamations = (subject.match(/!/g) || []).length;
  if (subjectExclamations >= 2) {
    issues.push({
      id: "subject-exclamations",
      severity: "error",
      message: `Subject has ${subjectExclamations} exclamation marks!!!`,
      detail: "Multiple exclamation marks in subjects are a major spam signal.",
      score: 1.5,
    });
  }

  // Subject too long
  if (subject.length > 78) {
    issues.push({
      id: "subject-length",
      severity: "warn",
      message: `Subject is ${subject.length} chars (recommended: ≤78)`,
      detail: "Long subjects get cut off and can reduce open rates.",
      score: 0.5,
    });
  }

  // Subject spam words
  const subjectSpamWords = SPAM_WORDS.filter(w => lowerSubject.includes(w));
  if (subjectSpamWords.length > 0) {
    issues.push({
      id: "subject-spam-words",
      severity: "error",
      message: `Subject contains spam trigger words`,
      detail: `Detected: "${subjectSpamWords.join('", "')}"`,
      score: subjectSpamWords.length * 0.8,
    });
  }

  // ── Body checks ───────────────────────────────────────────────────

  // Count links
  const linkMatches = htmlBody.match(/<a\s[^>]*href/gi) || [];
  if (linkMatches.length > 5) {
    issues.push({
      id: "too-many-links",
      severity: "error",
      message: `${linkMatches.length} hyperlinks detected (recommended: ≤5)`,
      detail: "Emails with many links look like spam or phishing. Keep it focused.",
      score: Math.min((linkMatches.length - 5) * 0.4, 2.0),
    });
  } else if (linkMatches.length > 3) {
    issues.push({
      id: "moderate-links",
      severity: "warn",
      message: `${linkMatches.length} hyperlinks (recommended: ≤3 for cold email)`,
      detail: "Fewer links = higher deliverability for cold outreach.",
      score: 0.3,
    });
  }

  // Missing unsubscribe
  const hasUnsubscribe =
    lowerText.includes("unsubscribe") ||
    lowerText.includes("opt out") ||
    lowerText.includes("opt-out") ||
    lowerText.includes("manage preferences") ||
    lowerText.includes("remove me");
  if (!hasUnsubscribe) {
    issues.push({
      id: "missing-unsubscribe",
      severity: "warn",
      message: "No unsubscribe link detected",
      detail: "Required by CAN-SPAM & GDPR for bulk email. Add an opt-out link.",
      score: 0.8,
    });
  }

  // Spam trigger words in body
  const bodySpamWords = SPAM_WORDS.filter(w => lowerText.includes(w));
  if (bodySpamWords.length >= 5) {
    issues.push({
      id: "body-spam-words-high",
      severity: "error",
      message: `${bodySpamWords.length} spam trigger words in body`,
      detail: `Detected: "${bodySpamWords.slice(0, 5).join('", "')}"${bodySpamWords.length > 5 ? ` and ${bodySpamWords.length - 5} more` : ""}`,
      score: Math.min(bodySpamWords.length * 0.3, 2.5),
    });
  } else if (bodySpamWords.length >= 2) {
    issues.push({
      id: "body-spam-words-low",
      severity: "warn",
      message: `${bodySpamWords.length} spam-adjacent words in body`,
      detail: `Detected: "${bodySpamWords.join('", "')}"`,
      score: bodySpamWords.length * 0.2,
    });
  }

  // Image-only check (low text/HTML ratio)
  const htmlLength = htmlBody.length;
  const textLength = textContent.length;
  const textRatio = htmlLength > 0 ? textLength / htmlLength : 1;
  if (htmlLength > 500 && textRatio < 0.1) {
    issues.push({
      id: "low-text-ratio",
      severity: "warn",
      message: "Very low text-to-HTML ratio",
      detail: "Emails that are mostly images/code with little text are flagged by spam filters.",
      score: 1.0,
    });
  }

  // All caps in body
  const bodyCapsWords = textContent.split(/\s+/).filter(
    w => w.length > 3 && w === w.toUpperCase() && /[A-Z]/.test(w)
  );
  if (bodyCapsWords.length >= 3) {
    issues.push({
      id: "body-allcaps",
      severity: "warn",
      message: `${bodyCapsWords.length} ALL CAPS words in body`,
      detail: "Excessive capitalization is a spam signal.",
      score: Math.min(bodyCapsWords.length * 0.15, 1.0),
    });
  }

  // Empty / very short body
  if (textContent.length < 50) {
    issues.push({
      id: "short-body",
      severity: "warn",
      message: "Email body is very short",
      detail: "Extremely short emails can trigger spam filters and reduce engagement.",
      score: 0.5,
    });
  }

  // Excessive punctuation
  const exclamationTotal = (textContent.match(/!/g) || []).length;
  if (exclamationTotal >= 5) {
    issues.push({
      id: "excessive-exclamations",
      severity: "warn",
      message: `${exclamationTotal} exclamation marks in body`,
      detail: "Heavy use of ! is a well-known spam signal.",
      score: Math.min(exclamationTotal * 0.1, 0.8),
    });
  }

  // Missing plain-text fallback signal (no alt text on images)
  const imgWithoutAlt = (htmlBody.match(/<img(?![^>]*alt=)[^>]*>/gi) || []).length;
  if (imgWithoutAlt > 0) {
    issues.push({
      id: "images-without-alt",
      severity: "info",
      message: `${imgWithoutAlt} image(s) missing alt text`,
      detail: "Images without alt text hurt accessibility and can affect filtering.",
      score: imgWithoutAlt * 0.1,
    });
  }

  // Calculate total score (0-10 scale, capped)
  const rawScore = issues.reduce((sum, issue) => sum + issue.score, 0);
  const totalScore = Math.min(rawScore, 10);

  let grade: SpamResult["grade"];
  if (totalScore <= 1.5) grade = "excellent";
  else if (totalScore <= 3.5) grade = "good";
  else if (totalScore <= 6) grade = "caution";
  else grade = "danger";

  return { issues, totalScore, grade };
}

// ─── Grade Config ────────────────────────────────────────────────────
const GRADE_CONFIG = {
  excellent: {
    label: "Excellent",
    color: "text-rose-foam",
    bg: "bg-rose-foam/10",
    border: "border-rose-foam/40",
    bar: "bg-rose-foam",
    description: "Your email looks clean. Great deliverability expected.",
  },
  good: {
    label: "Good",
    color: "text-rose-pine",
    bg: "bg-rose-pine/10",
    border: "border-rose-pine/40",
    bar: "bg-rose-pine",
    description: "Minor issues found. Fix them for optimal delivery.",
  },
  caution: {
    label: "Caution",
    color: "text-rose-gold",
    bg: "bg-rose-gold/10",
    border: "border-rose-gold/40",
    bar: "bg-rose-gold",
    description: "Several spam signals detected. Review warnings below.",
  },
  danger: {
    label: "High Risk",
    color: "text-rose-love",
    bg: "bg-rose-love/10",
    border: "border-rose-love/40",
    bar: "bg-rose-love",
    description: "This email will likely be filtered as spam. Fix critical issues.",
  },
};

// ─── Issue Row ───────────────────────────────────────────────────────
function IssueRow({ issue }: { issue: SpamIssue }) {
  const icons = {
    error: <XCircle size={14} className="text-rose-love flex-shrink-0 mt-0.5" />,
    warn: <AlertTriangle size={14} className="text-rose-gold flex-shrink-0 mt-0.5" />,
    info: <CheckCircle size={14} className="text-rose-foam flex-shrink-0 mt-0.5" />,
  };
  const borders = {
    error: "border-rose-love/30",
    warn: "border-rose-gold/30",
    info: "border-rose-foam/30",
  };

  return (
    <div className={`border ${borders[issue.severity]} p-2.5 space-y-0.5`}>
      <div className="flex items-start gap-2">
        {icons[issue.severity]}
        <span className="text-[11px] font-extrabold text-rose-text">{issue.message}</span>
      </div>
      {issue.detail && (
        <p className="text-[10px] text-rose-muted font-medium pl-5 leading-relaxed">{issue.detail}</p>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
interface SpamCheckerProps {
  subject: string;
  htmlBody: string;
}

export function SpamChecker({ subject, htmlBody }: SpamCheckerProps) {
  const result = useMemo(() => analyzeSpam(subject, htmlBody), [subject, htmlBody]);
  const cfg = GRADE_CONFIG[result.grade];
  const scorePercent = (result.totalScore / 10) * 100;

  const errors = result.issues.filter(i => i.severity === "error");
  const warnings = result.issues.filter(i => i.severity === "warn");
  const infos = result.issues.filter(i => i.severity === "info");

  return (
    <div className="space-y-4">
      {/* Score Card */}
      <div className={`border-2 ${cfg.border} ${cfg.bg} p-4 space-y-3`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={16} className={cfg.color} />
            <span className="text-xs font-black uppercase tracking-wider text-rose-text">Spam Score</span>
          </div>
          <span className={`text-2xl font-black tabular-nums ${cfg.color}`}>
            {result.totalScore.toFixed(1)}<span className="text-base text-rose-muted font-bold">/10</span>
          </span>
        </div>

        {/* Score Bar */}
        <div className="w-full h-2 bg-rose-hl-med rounded-none overflow-hidden">
          <div
            className={`h-full ${cfg.bar} transition-all duration-500`}
            style={{ width: `${scorePercent}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <span className={`text-xs font-extrabold uppercase tracking-wider ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-rose-muted font-semibold">{cfg.description}</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-rose-love/10 border border-rose-love/30 p-2.5 text-center">
          <div className="text-xl font-black text-rose-love">{errors.length}</div>
          <div className="text-[9px] text-rose-muted font-extrabold uppercase tracking-wider">Critical</div>
        </div>
        <div className="bg-rose-gold/10 border border-rose-gold/30 p-2.5 text-center">
          <div className="text-xl font-black text-rose-gold">{warnings.length}</div>
          <div className="text-[9px] text-rose-muted font-extrabold uppercase tracking-wider">Warnings</div>
        </div>
        <div className="bg-rose-foam/10 border border-rose-foam/30 p-2.5 text-center">
          <div className="text-xl font-black text-rose-foam">{infos.length}</div>
          <div className="text-[9px] text-rose-muted font-extrabold uppercase tracking-wider">Info</div>
        </div>
      </div>

      {/* Quick Metrics */}
      <div className="border border-rose-hl-med bg-rose-overlay/20 p-3 space-y-2">
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-muted">Email Metrics</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          <MetricRow icon={<AlignLeft size={11} />} label="Subject length" value={`${subject.length} chars`} />
          <MetricRow icon={<Hash size={11} />} label="Word count" value={`${htmlBody.replace(/<[^>]+>/g,'').trim().split(/\s+/).filter(Boolean).length} words`} />
          <MetricRow icon={<Link size={11} />} label="Links" value={`${(htmlBody.match(/<a\s[^>]*href/gi) || []).length} found`} />
          <MetricRow icon={<Zap size={11} />} label="Spam words" value={`${SPAM_WORDS.filter(w => htmlBody.toLowerCase().includes(w)).length} detected`} />
          <MetricRow icon={<Eye size={11} />} label="Images" value={`${(htmlBody.match(/<img/gi) || []).length} found`} />
          <MetricRow icon={<MessageSquare size={11} />} label="Unsubscribe" value={htmlBody.toLowerCase().includes("unsubscribe") ? "✓ Present" : "✗ Missing"} />
        </div>
      </div>

      {/* Issues List */}
      {result.issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-2 border border-dashed border-rose-foam/30">
          <CheckCircle size={24} className="text-rose-foam" />
          <p className="text-sm font-extrabold text-rose-foam">No issues detected!</p>
          <p className="text-[11px] text-rose-muted text-center font-medium">
            Your email passes all spam checks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-love flex items-center gap-1.5">
                <XCircle size={11} /> Critical Issues ({errors.length})
              </p>
              {errors.map(issue => <IssueRow key={issue.id} issue={issue} />)}
            </div>
          )}
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-gold flex items-center gap-1.5">
                <AlertTriangle size={11} /> Warnings ({warnings.length})
              </p>
              {warnings.map(issue => <IssueRow key={issue.id} issue={issue} />)}
            </div>
          )}
          {infos.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-foam flex items-center gap-1.5">
                <CheckCircle size={11} /> Suggestions ({infos.length})
              </p>
              {infos.map(issue => <IssueRow key={issue.id} issue={issue} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  const isNegative = value.startsWith("✗");
  const isPositive = value.startsWith("✓");
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-rose-muted">{icon}</span>
      <span className="text-[10px] text-rose-muted font-semibold truncate">{label}:</span>
      <span className={`text-[10px] font-extrabold ml-auto ${isNegative ? "text-rose-love" : isPositive ? "text-rose-foam" : "text-rose-text"}`}>
        {value}
      </span>
    </div>
  );
}
