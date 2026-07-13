"""
Deliverability Guard service — checks email content for potential spam indicators
to protect email deliverability and sender reputation.
"""
import re


class DeliverabilityGuard:
    """Performs spam and capitalization analysis on email subject and html body."""

    SPAM_TRIGGERS = [
        "100% free", "act now", "action required", "all new", "as seen on",
        "best price", "billing", "bonus", "buy direct", "call now", "cash",
        "cash bonus", "cheap", "clearance", "click here", "consolidate debt",
        "crypto", "bitcoin", "double your", "earn money", "easy money",
        "eliminate debt", "exclusive deal", "expire", "extra income",
        "fantastic deal", "fast cash", "financial freedom", "free gift",
        "free investment", "get rich", "get paid", "guarantee",
        "increase traffic", "investment", "limited time", "lose weight",
        "lowest price", "make money", "million dollars", "multi-level marketing",
        "no catch", "no cost", "no fees", "no gimmick", "no hidden",
        "no obligation", "no strings attached", "now only", "obligation",
        "once in a lifetime", "one time", "opt in", "pennies a day",
        "please help", "pure profit", "refinance", "risk free", "save big",
        "save up to", "special promotion", "urgent", "us dollars", "winner",
        "work from home", "zero risk", "zero percent"
    ]

    def analyze_content(self, subject: str, html_body: str) -> tuple[bool, list[str]]:
        """
        Analyze subject and body content.
        Returns:
            (is_spammy: bool, reasons: list[str])
        """
        reasons = []

        # 1. Strip HTML tags from body for plain text analysis
        body_text = re.sub(r"<[^>]+>", " ", html_body)

        # 2. Capitalization check - Subject
        alpha_subject = [c for c in subject if c.isalpha()]
        if len(alpha_subject) >= 5:
            upper_ratio = sum(1 for c in alpha_subject if c.isupper()) / len(alpha_subject)
            if upper_ratio > 0.6:
                reasons.append(f"Excessive subject capitalization ({upper_ratio:.1%})")

        # 3. Capitalization check - Body
        alpha_body = [c for c in body_text if c.isalpha()]
        if len(alpha_body) >= 20:
            upper_ratio = sum(1 for c in alpha_body if c.isupper()) / len(alpha_body)
            if upper_ratio > 0.4:
                reasons.append(f"Excessive body text capitalization ({upper_ratio:.1%})")

        # 4. Keyword verification
        normalized_subject = " ".join(subject.lower().split())
        normalized_body = " ".join(body_text.lower().split())

        found_triggers = []
        for trigger in self.SPAM_TRIGGERS:
            pattern = rf"\b{re.escape(trigger)}\b"
            if re.search(pattern, normalized_subject) or re.search(pattern, normalized_body):
                found_triggers.append(trigger)

        if found_triggers:
            reasons.append(f"Spam triggers detected: {', '.join(found_triggers)}")

        is_spammy = len(reasons) > 0
        return is_spammy, reasons
