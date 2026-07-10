// Pre-built HTML email starter templates that match the Flat & Sharp Tech aesthetic.
export interface StarterTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  icon: string;
  html: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "plain-text-cold-mail",
    name: "Plain Text Cold Mail",
    subject: "Application: {{ job_title }} — {{ sender_name }}",
    description: "Highly deliverable, tag-free plain text layout ideal for text-only campaigns",
    icon: "file-text",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;color:#3a3f3f;line-height:1.6;font-size:15px;">
  <p>Dear {{ recipient_name }},</p>

  <p>My name is {{ sender_name }}, and I'm writing to express my interest in joining {{ company_name }} as a {{ job_title }}.</p>

  <p>I specialize in building scalable systems and optimizing web application performance. Over the past few years, I've focused on maintaining high standards of clean code and delivering impact quickly.</p>

  <p>You can view my portfolio and professional projects at: [portfolio_url]</p>

  <p>I have attached my resume for your consideration. I would love to learn more about {{ company_name }}'s upcoming engineering initiatives and see if my background matches your team's goals.</p>

  <p>Best regards,</p>
  <p><strong>{{ sender_name }}</strong></p>
</body>
</html>`,
  },
  {
    id: "cold-job-app",
    name: "Cold Job Application",
    subject: "Application: {{ job_title }} — {{ sender_name }}",
    description: "Modern professional layout with competencies highlight panel",
    icon: "mail",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <!-- Top Accent Banner -->
          <tr>
            <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Opportunity Acquisition</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Application: {{ job_title }}</p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                My name is <strong>{{ sender_name }}</strong>, and I am writing to express my interest in joining the team at <strong>{{ company_name }}</strong> as a <strong>{{ job_title }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I've been following {{ company_name }}'s engineering developments and am eager to discuss how my skill set matches your team's objectives.
              </p>

              <!-- Competencies Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;color:#3a94c5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Core Competencies</p>
                    <p style="margin:0;color:#3a3f3f;font-size:14px;line-height:1.8;font-weight:700;">
                      ✓ Scalable Architecture & System Design<br>
                      ✓ Performance Optimization & Clean Code Standards<br>
                      ✓ Rapid Feature Integration
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">View My Portfolio</a>
                  </td>
                </tr>
              </table>
              
              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">I've attached my resume for your review. I look forward to hearing from you.</p>
            </td>
          </tr>
          <!-- Footer Signature -->
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "job-app-followup",
    name: "Job Application Follow-up",
    subject: "Following up on Application: {{ job_title }}",
    description: "Clean timing layout with action card and Calendly button",
    icon: "clock",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Pending Application</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Follow-up: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope you're having a productive week.
              </p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'm following up on my application for the <strong>{{ job_title }}</strong> role at <strong>{{ company_name }}</strong>. I remain extremely interested in contributing to your current projects.
              </p>

              <!-- Highlights Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      ⏱️ <strong>Application Status:</strong> Submitted & Under Review<br>
                      📍 <strong>Target Role:</strong> {{ job_title }}
                    </p>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Schedule Quick Call</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">Let me know if there are any other materials I can provide.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "recruiter-outreach",
    name: "Recruiter Outreach",
    subject: "Introduction: {{ sender_name }} — potential match for open roles",
    description: "Emerald-themed introduction layout with portfolio button",
    icon: "users",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#8da101;background-image:linear-gradient(135deg,#8da101 0%,#3a94c5 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Talent Collaboration</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Introduction: {{ sender_name }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope you're doing well. I came across your recruitment focus at <strong>{{ company_name }}</strong> and wanted to introduce myself.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I specialize in high-efficiency engineering pipelines. I am currently looking for new challenges as a <strong>{{ job_title }}</strong> and would love to see if my background matches {{ company_name }}'s current needs.
              </p>

              <!-- Focus Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      💡 <strong>Specialties:</strong> Front-end scaling, Web performance, & Transaction systems.
                    </p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#8da101;background-image:linear-gradient(135deg,#8da101 0%,#3a94c5 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">View Professional Profile</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">I've attached my resume and welcome a chat at your convenience.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "referral-request",
    name: "Referral Request",
    subject: "Inquiry regarding roles at {{ company_name }}",
    description: "Gold-themed request layout with job details card",
    icon: "link",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#f85552 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Internal Network</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Referral Request: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'm reaching out because I noticed an opening for a <strong>{{ job_title }}</strong> role at <strong>{{ company_name }}</strong> and believe my background is a strong fit.
              </p>

              <!-- Job Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      🏢 <strong>Target Company:</strong> {{ company_name }}<br>
                      💼 <strong>Position:</strong> {{ job_title }}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Knowing your team's focus on quality, would you be open to referring me internally or sharing some quick advice on the hiring loops?
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#f85552 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Review My Resume</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Thanks again,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "thank-you-interview",
    name: "Thank You After Interview",
    subject: "Thank You: {{ job_title }} Interview",
    description: "Appreciation layout with a discussion recap panel",
    icon: "sparkles",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a3f3f;background-image:linear-gradient(135deg,#3a3f3f 0%,#3a3f3f 60%,#2d353b 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Appreciation Log</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Interview Feedback: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Thank you for taking the time to speak with me today regarding the <strong>{{ job_title }}</strong> role at <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I really enjoyed learning more about your team's engineering challenges and roadmap. The conversation further confirmed my excitement about joining {{ company_name }}.
              </p>

              <!-- Discussion Recap -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      📝 <strong>Core Takeaway:</strong> Our discussion on resolving pipeline latencies matched my expertise in caching systems perfectly.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">Please let me know if there are any other details I can provide. I look forward to hearing about the next steps.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "salary-negotiation",
    name: "Salary Negotiation",
    subject: "Proposal: Discussion regarding compensation structure",
    description: "Gold-themed negotiation layout with value recap section",
    icon: "dollar-sign",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#dfa000 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Compensation Discussion</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Offer Details: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Thank you very much for offering me the <strong>{{ job_title }}</strong> position at <strong>{{ company_name }}</strong>. I am thrilled about the opportunity to join the team.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Before formally accepting, I wanted to discuss the compensation package. Given my skills in developing robust architectures, I was hoping we could explore raising the base salary component closer to market parameters.
              </p>

              <!-- Value Proposition Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      💡 <strong>Proposed Value:</strong> Bringing experience in pipeline optimizations that will reduce operational costs from day one.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'm fully committed to making this transition a success. Let me know if we can schedule a quick call to talk details.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#dfa000 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Schedule Sync Call</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Sincerely,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "offer-acceptance",
    name: "Offer Acceptance",
    subject: "Offer Acceptance: {{ job_title }}",
    description: "Emerald-themed offer acceptance layout with next steps checklist",
    icon: "check-circle",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#10b981;background-image:linear-gradient(135deg,#10b981 0%,#8da101 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Onboarding Initiation</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Offer Acceptance: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I am writing to formally accept the job offer for the <strong>{{ job_title }}</strong> position at <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I want to thank you and the rest of the interview panel for this opportunity. I am excited to get started and contribute to the team's engineering goals.
              </p>

              <!-- Next Steps checklist -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;color:#3a3f3f;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Next Steps Checklist</p>
                    <p style="margin:0;color:#859289;font-size:13px;line-height:1.6;font-weight:700;">
                      ☐ Return Signed Offer Letter<br>
                      ☐ Complete Background Check Authorization<br>
                      ☐ Align on Onboarding Start Date
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">Please let me know what onboarding details, dates, or paperwork need to be completed next.</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "offer-decline",
    name: "Offer Decline",
    subject: "Declining Offer: {{ job_title }}",
    description: "Rose-themed decline layout with networking call-to-action",
    icon: "x-circle",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#f85552;background-image:linear-gradient(135deg,#f85552 0%,#b91c1c 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Offer Outcome</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Decision: {{ job_title }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Thank you very much for offering me the <strong>{{ job_title }}</strong> opportunity at <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                After careful consideration, I have decided to accept another offer that aligns more closely with my current professional growth path. Therefore, I must politely decline your offer.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I really appreciated the time spent discussing your team's roadmap and hope we can cross paths in the industry again.
              </p>

              <!-- CTA LinkedIn link -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f85552;background-image:linear-gradient(135deg,#f85552 0%,#b91c1c 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Stay Connected on LinkedIn</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Sincerely,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "cold-client-outreach",
    name: "Cold Client Outreach",
    subject: "Outreach: Custom solutions for {{ company_name }}",
    description: "Royal Blue sales outreach layout with performance card",
    icon: "target",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#0ea5e9 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Innovative Solutions</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Optimizing {{ company_name }}'s Platforms</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope this email finds you well. I came across <strong>{{ company_name }}</strong>'s engineering profile and noticed your focus on scaling transactional workloads.
              </p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I help SaaS organizations construct high-performance infrastructures. Recent integrations I deployed boosted platform speed parameters significantly.
              </p>

              <!-- Value Prop Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      ⚡ <strong>Core Focus:</strong> Eradicating database choke points & automating code layouts.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Would you be open to a brief 10-minute introduction call next Tuesday to see if we can help optimize {{ company_name }}'s setups?
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#0ea5e9 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Book a Free Audit</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "freelance-proposal",
    name: "Freelance Proposal",
    subject: "Proposal: Consulting & Project Support for {{ company_name }}",
    description: "Detailed proposal layout with timeline matrix table",
    icon: "file-text",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a3f3f;background-image:linear-gradient(135deg,#3a3f3f 0%,#334155 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Scope Proposal</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Project Plan: {{ company_name }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Thank you for sharing the requirements for the <strong>{{ job_title }}</strong> contract scope at <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Based on your criteria, I have designed a 4-week architectural roadmap to construct and deploy the core pipelines using clean, maintainable patterns.
              </p>

              <!-- Milestone table -->
              <table width="100%" cellpadding="8" cellspacing="0" style="border:2px solid #3a3f3f;margin-bottom:24px;font-size:13px;">
                <tr style="background:#edeada;font-weight:800;">
                  <td style="border-bottom:2px solid #3a3f3f;">Phase</td>
                  <td style="border-bottom:2px solid #3a3f3f;">Milestone / Deliverable</td>
                </tr>
                <tr>
                  <td style="border-bottom:1px solid #e2e8f0;font-weight:700;">Week 1-2</td>
                  <td style="border-bottom:1px solid #e2e8f0;">Architectural Mockups & Database Integration</td>
                </tr>
                <tr>
                  <td>Week 3-4</td>
                  <td>Core APIs development & Final System Auditing</td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I've attached my full contract specification breakdown. Let me know if you would like to run through it.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a3f3f;background-image:linear-gradient(135deg,#3a3f3f 0%,#334155 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Review Full Proposal</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "meeting-request",
    name: "Meeting Request",
    subject: "Meeting Request: Discussing cooperation opportunities",
    description: "Iris-themed meeting request with topics bullets",
    icon: "calendar",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#4f46e5 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Calendar Scheduling</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Brief Sync Request: {{ company_name }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope you're doing well.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'm reaching out to see if you have some availability this week for a brief catch-up regarding <strong>{{ company_name }}</strong>'s engineering roadmap.
              </p>

              <!-- Discussion topics -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;color:#3a3f3f;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Points of Discussion</p>
                    <p style="margin:0;color:#859289;font-size:13px;line-height:1.6;font-weight:700;">
                      • Integration timelines & API bounds<br>
                      • Performance guidelines & caching policies
                    </p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#4f46e5 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Book Time on Calendly</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "general-appreciation",
    name: "Thank You / Appreciation",
    subject: "Appreciation & Thank You",
    description: "Rose-themed card layout showing peer gratitude",
    icon: "thumbs-up",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#db2777;background-image:linear-gradient(135deg,#db2777 0%,#f43f5e 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Appreciation Log</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Thank You, {{ recipient_name }}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I wanted to write a quick note to say thank you for your help during our recent project cycle at <strong>{{ company_name }}</strong>.
              </p>

              <!-- Highlight note -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;font-style:italic;">
                      "Your prompt feedback and support on the code review made a significant impact on our deploy latency."
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#3a3f3f;font-size:15px;line-height:1.7;">I really value having you as a collaborator. Let's grab coffee soon!</p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "cold-sales-zsyio",
    name: "Cold Sales Email (Zsyio)",
    subject: "Introducing Zsyio: Optimize operations at {{ company_name }}",
    description: "Lightning banner layout pitching Zsyio platform solutions",
    icon: "zap",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#3a94c5 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Outreach Acceleration</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Zsyio Outreach Automation</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope you're well. I came across your profile and noticed you manage engineering services at <strong>{{ company_name }}</strong>.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We built <strong>Zsyio</strong> to help teams automate custom email campaigns, reducing delivery overhead by up to 50% while maintaining premium lookups.
              </p>

              <!-- Value Props Grid -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;color:#3a94c5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Why Zsyio</p>
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      ✓ Zero setup latency — connects instantly<br>
                      ✓ Encrypted API key vaulting<br>
                      ✓ Dynamic neobrutalist templates catalog
                    </p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#3a94c5 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Request Free Access</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "sales-followup",
    name: "Sales Follow-up",
    subject: "Following up on our discussion",
    description: "Orange-themed follow-up with brief sync card",
    icon: "flame",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#ea580c 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Product Roadmap</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Checking In: Zsyio Integration</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'm checking in to see if you had a chance to review the Zsyio proposal I sent over last week for <strong>{{ company_name }}</strong>.
              </p>

              <!-- Proposal Recap Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      💡 <strong>Proposal Summary:</strong> Full workflow integration for {{ company_name }} with priority support.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I'd love to help resolve any questions or customize the package to fit your exact targets. Let me know if we can align on a quick sync.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#dfa000;background-image:linear-gradient(135deg,#dfa000 0%,#ea580c 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Schedule Sync Call</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "demo-invitation",
    name: "Demo Invitation",
    subject: "Invitation: Live Product Demonstration",
    description: "Royal Blue invitations layout with live presentation details",
    icon: "monitor",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#1d4ed8 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Live Presentation</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Zsyio Platform Demonstration</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We are hosting a live walkthrough demo of our new platform updates, and I'd love to invite you and your team at <strong>{{ company_name }}</strong> to join.
              </p>

              <!-- Session Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      📅 <strong>Schedule:</strong> Thursday, 2:00 PM EST<br>
                      🖥️ <strong>Access:</strong> Google Meet (Invitation to follow)
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Let me know if you would like me to register a slot for you and the {{ company_name }} engineering leads!
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#1d4ed8 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Save My Spot</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "welcome-onboarding",
    name: "Welcome / Onboarding",
    subject: "Welcome to BulkReach!",
    description: "Warm welcome layout with step-by-step Quickstart guide",
    icon: "gift",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);">
            <td style="padding:32px 32px 24px;border-bottom:2px solid #3a3f3f;text-align:center;">
              <p style="margin:0;color:#ffffff;font-size:32px;">🎉</p>
              <p style="margin:8px 0 0;color:#ffffff;font-size:22px;font-weight:900;letter-spacing:-0.5px;">Welcome to BulkReach!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We are excited to have you onboard at <strong>{{ company_name }}</strong>. BulkReach is designed to help you streamline your bulk outreach loops from day one.
              </p>

              <!-- Quickstart card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 12px;color:#3a94c5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Quickstart Checklist</p>
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.8;font-weight:700;">
                      1. Connect your Gmail mailbox in Settings.<br>
                      2. Configure your Google Gemini API Key.<br>
                      3. Create your first campaign template & launch!
                    </p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Get Started Now</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "product-newsletter",
    name: "Product Update / Newsletter",
    subject: "Product Update & Newsletter",
    description: "Dual-column feature layout with clean dividers",
    icon: "megaphone",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#3a94c5 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Product Bulletin</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">What's New in Phase 2, {{ recipient_name }}!</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hello,</p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We have rolled out major updates to our template cataloging system and added a flat Settings dashboard to help you connect Gmail effortlessly.
              </p>

              <!-- Updates Grid -->
              <table width="100%" cellpadding="0" cellspacing="12" style="margin-bottom:24px;table-layout:fixed;">
                <tr>
                  <td style="background:#edeada;border:2px solid #3a3f3f;padding:16px;vertical-align:top;width:50%;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#3a94c5;">📊 side-by-side charts</p>
                    <p style="margin:0;font-size:12px;color:#859289;line-height:1.5;font-weight:600;">Neobrutalist BarCharts built for clear statistics display.</p>
                  </td>
                  <td style="background:#edeada;border:2px solid #3a3f3f;padding:16px;vertical-align:top;width:50%;">
                    <p style="margin:0 0 6px;font-size:13px;font-weight:800;color:#3a94c5;">🔒 API key vault</p>
                    <p style="margin:0;font-size:12px;color:#859289;line-height:1.5;font-weight:600;">Encrypted API credentials storage system.</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#3a94c5 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Read Full Changelog</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "password-reset",
    name: "Password Reset / Verification",
    subject: "Reset your account password",
    description: "Secure transactional layout with code box and warning callout",
    icon: "lock",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a3f3f;background-image:linear-gradient(135deg,#3a3f3f 0%,#3a3f3f 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Security Alert</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Verification Requested</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hello {{ recipient_name }},</p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We received a request to authorize a credential check for your account at <strong>{{ company_name }}</strong>. Please use the verification code below to validate:
              </p>

              <!-- Verification code box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;text-align:center;">
                <tr>
                  <td>
                    <span style="display:inline-block;font-family:monospace;font-size:26px;font-weight:900;border:2px dashed #3a3f3f;padding:12px 32px;background:#edeada;letter-spacing:2px;">{{ job_title }}</span>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#f85552;font-size:12px;line-height:1.6;font-weight:700;">
                ⚠️ <strong>Note:</strong> If you did not make this request, you can safely ignore this mail.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "support-ticket",
    name: "Support Ticket Confirmation",
    subject: "Support Ticket Received: #{{ ticket_id }}",
    description: "Support ticket confirmation with description block",
    icon: "ticket",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#f85552;background-image:linear-gradient(135deg,#f85552 0%,#f97316 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Ticket Registered</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Support Ticket Logged</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Hi {{ recipient_name }},</p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We have received your support request regarding <strong>{{ company_name }}</strong>. A ticket has been logged successfully and our team is currently investigating.
              </p>

              <!-- Ticket details -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      🎫 <strong>Ticket Subject:</strong> {{ job_title }}<br>
                      🔧 <strong>Status:</strong> Assigned to technician
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#475569;font-size:13px;line-height:1.65;font-style:italic;">
                Our technical support leads will contact you shortly to guide you through resolving the issue.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f85552;background-image:linear-gradient(135deg,#f85552 0%,#f97316 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">View Ticket Status</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
  {
    id: "partnership-proposal",
    name: "Partnership / Collaboration Proposal",
    subject: "Proposal: Strategic Partnership Opportunities",
    description: "Rocket banner layout detailing partnership synergy points",
    icon: "rocket",
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#f2efdf;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f2efdf;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border:2px solid #3a3f3f;box-shadow:4px 4px 0px 0px #3a3f3f;border-collapse:collapse;text-align:left;">
          <tr style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);">
            <td style="padding:24px 32px;border-bottom:2px solid #3a3f3f;">
              <p style="margin:0;color:#ffffff;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Joint Ventures</p>
              <p style="margin:4px 0 0;color:#ffffff;font-size:20px;font-weight:900;letter-spacing:-0.5px;">Partnership Proposal: {{ company_name }}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;font-weight:600;">Dear {{ recipient_name }},</p>
              <p style="margin:0 0 16px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                I hope you're having a productive week. I'm reaching out from <strong>{{ company_name }}</strong> regarding a potential partnership opportunity.
              </p>
              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                We have been following your growth and believe there is a great synergy between our audiences. We'd love to discuss co-hosting a live event or running a joint tech promotion.
              </p>

              <!-- Synergy Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#edeada;border:2px solid #3a3f3f;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px;">
                    <p style="margin:0 0 8px;color:#3a94c5;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;">Proposed Synergy Points</p>
                    <p style="margin:0;color:#3a3f3f;font-size:13px;line-height:1.6;font-weight:700;">
                      • Joint technical webinars & engineering panels<br>
                      • Cross-integration support for mutual customers
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 24px;color:#3a3f3f;font-size:15px;line-height:1.7;">
                Would you be open to a brief sync next week to exchange ideas?
              </p>

              <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#3a94c5;background-image:linear-gradient(135deg,#3a94c5 0%,#df69ba 100%);border:2px solid #3a3f3f;box-shadow:3px 3px 0px 0px #3a3f3f;">
                    <a href="#" style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:13px;font-weight:800;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">Schedule Sync Call</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#f2efdf;padding:24px 32px;border-top:2px solid #3a3f3f;color:#859289;font-size:13px;font-weight:600;">
              Best regards,<br>
              <strong style="color:#3a94c5;font-size:14px;font-weight:800;">{{ sender_name }}</strong>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  },
];
