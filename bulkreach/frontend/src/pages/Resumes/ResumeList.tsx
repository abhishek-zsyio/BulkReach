import { useState, useEffect } from "react";
import { 
  Plus, Briefcase, Trash2, Calendar, FileText, Check, 
  X, Loader2, ArrowLeft, Save, Sparkles, Copy, Download, User, Edit3, Code, Eye, XCircle,
  Phone, Github, Linkedin, Mail, Globe, ChevronDown
} from "lucide-react";
import { 
  useGetResumesQuery, 
  useUploadResumeMutation,
  useCreateResumeMutation,
  useUpdateResumeMutation, 
  useDeleteResumeMutation,
  useTailorResumeMutation,
  useParseResumeMutation
} from "@/api/resumeApi";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/helpers";
import { API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirm, usePrompt } from "@/components/ui/dialogs";
import { ResumeUploadModal } from "@/components/scraper/ResumeUploadModal";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } }
};

interface Experience {
  role: string;
  company: string;
  duration: string;
  description: string;
}

interface Education {
  degree: string;
  school: string;
  duration: string;
  gpa?: string;
}

interface Project {
  name: string;
  technologies?: string;
  link?: string;
  description: string;
}

export function ResumeList() {
  const { user, accessToken } = useAuth();
  const { confirm, modal: confirmModal } = useConfirm();
  const { prompt, modal: promptModal } = usePrompt();
  const { data: resumes = [], isLoading, refetch } = useGetResumesQuery();
  const [createResume, { isLoading: isCreating }] = useCreateResumeMutation();
  const [uploadResume, { isLoading: isUploadingFile }] = useUploadResumeMutation();
  const [updateResume, { isLoading: isUpdating }] = useUpdateResumeMutation();
  const [deleteResume, { isLoading: isDeleting }] = useDeleteResumeMutation();
  const [tailorResume, { isLoading: isTailoring }] = useTailorResumeMutation();
  const [parseResume, { isLoading: isParsing }] = useParseResumeMutation();

  const handleParseResume = async () => {
    if (!selectedResumeId) return;
    const loadingToast = toast.loading("AI Parser is running...");
    try {
      await parseResume(selectedResumeId).unwrap();
      toast.success("Resume parsed successfully!", { id: loadingToast });
      refetch();
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.data?.message || err?.message || "Failed to parse resume.";
      toast.error(errMsg, { id: loadingToast });
    }
  };

  // Navigation / Active View State
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<"contact" | "skills" | "experience" | "education" | "projects">("contact");

  // Active Resume Edit Fields
  const [resumeNameEdit, setResumeNameEdit] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [github, setGithub] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [summary, setSummary] = useState("");
  
  // Categorized Skills Editor State
  const [skillsDict, setSkillsDict] = useState<Record<string, string[]>>({});
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newSkillInput, setNewSkillInput] = useState<Record<string, string>>({});

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [educations, setEducations] = useState<Education[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // AI Workspace Fields & Selection Controls
  const [jobDescription, setJobDescription] = useState("");
  const [tailoredProfile, setTailoredProfile] = useState<any>(null);
  const [targetCompany, setTargetCompany] = useState("");
  const [targetRole, setTargetRole] = useState("");
  
  // Right Workspace Navigation Controls
  const [rightActiveTab, setRightActiveTab] = useState<"preview" | "tailor">("preview");
  const [previewSubTab, setPreviewSubTab] = useState<"visual" | "latex" | "markdown">("visual");
  const [tailorPreviewTab, setTailorPreviewTab] = useState<"visual" | "latex" | "markdown">("visual");
  const [latexTemplateStyle, setLatexTemplateStyle] = useState<"academic" | "minimalist" | "modern">("academic");
  const [showPreviewStyleDropdown, setShowPreviewStyleDropdown] = useState(false);
  const [showTailorStyleDropdown, setShowTailorStyleDropdown] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newResumeName, setNewResumeName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isManualCreate, setIsManualCreate] = useState(false);

  const selectedResume = resumes.find(r => r.id === selectedResumeId);

  // Sync edits state when selectedResume changes
  useEffect(() => {
    if (selectedResume) {
      setResumeNameEdit(selectedResume.name || "");
      const sd = selectedResume.structured_data || {};
      setContactName(sd.name || "");
      setContactEmail(sd.email || "");
      setContactPhone(sd.phone || "");
      setGithub(sd.github || "");
      setLinkedin(sd.linkedin || "");
      setPortfolio(sd.portfolio || "");
      setSummary(sd.summary || "");
      
      // Parse skills (support flat list or dictionary)
      const rawSkills = sd.skills || [];
      const parsedSkills = getCategorizedSkills(rawSkills);
      setSkillsDict(parsedSkills);
      setNewSkillInput({});
      setNewCategoryName("");

      setExperiences(sd.experience || []);
      setEducations(sd.education || []);
      setProjects(sd.projects || []);
      
      // Reset tailoring workspace and right-column tab
      setJobDescription("");
      setTailoredProfile(null);
      setTargetCompany("");
      setTargetRole("");
      setRightActiveTab("preview");
      setPreviewSubTab("visual");
      setTailorPreviewTab("visual");
    }
  }, [selectedResumeId, resumes]);



  const handleSaveChanges = async () => {
    if (!selectedResumeId) return;
    if (!resumeNameEdit.trim()) {
      toast.error("Resume name cannot be empty.");
      return;
    }

    try {
      const updatedStructuredData = {
        name: contactName,
        email: contactEmail,
        phone: contactPhone,
        github,
        linkedin,
        portfolio,
        summary,
        skills: skillsDict,
        experience: experiences,
        education: educations,
        projects
      };

      await updateResume({
        id: selectedResumeId,
        data: {
          name: resumeNameEdit,
          structured_data: updatedStructuredData
        }
      }).unwrap();
      toast.success("Resume changes saved successfully!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save changes.");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete Resume Profile",
      message: `Are you sure you want to delete the resume profile "${name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteResume(id).unwrap();
      toast.success("Resume profile deleted.");
      if (selectedResumeId === id) {
        setSelectedResumeId(null);
      }
      refetch();
    } catch {
      toast.error("Failed to delete resume.");
    }
  };

  // Skill Editor Action Managers
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (name && !skillsDict[name]) {
      setSkillsDict({
        ...skillsDict,
        [name]: []
      });
      setNewCategoryName("");
      toast.success(`Category "${name}" added!`);
    }
  };

  const handleRemoveCategory = async (categoryToRemove: string) => {
    const ok = await confirm({
      title: "Delete Category",
      message: `Are you sure you want to delete category "${categoryToRemove}"? All skills inside it will be lost.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (ok) {
      const updated = { ...skillsDict };
      delete updated[categoryToRemove];
      setSkillsDict(updated);
    }
  };

  const handleAddSkillToCategory = (category: string) => {
    const skillValue = (newSkillInput[category] || "").trim();
    if (skillValue) {
      const currentList = skillsDict[category] || [];
      if (!currentList.includes(skillValue)) {
        setSkillsDict({
          ...skillsDict,
          [category]: [...currentList, skillValue]
        });
        setNewSkillInput({
          ...newSkillInput,
          [category]: ""
        });
      }
    }
  };

  const handleRemoveSkillFromCategory = (category: string, skillToRemove: string) => {
    const currentList = skillsDict[category] || [];
    setSkillsDict({
      ...skillsDict,
      [category]: currentList.filter(s => s !== skillToRemove)
    });
  };

  // Experience Managers
  const handleAddExperience = () => {
    setExperiences([
      ...experiences,
      { role: "Software Engineer", company: "Company Name", duration: "2024 - Present", description: "" }
    ]);
  };

  const handleUpdateExperience = (index: number, field: keyof Experience, value: string) => {
    const updated = experiences.map((exp, i) => {
      if (i === index) {
        return { ...exp, [field]: value };
      }
      return exp;
    });
    setExperiences(updated);
  };

  const handleRemoveExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  // Education Managers
  const handleAddEducation = () => {
    setEducations([
      ...educations,
      { degree: "B.S. Computer Science", school: "University Name", duration: "2020 - 2024", gpa: "" }
    ]);
  };

  const handleUpdateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = educations.map((edu, i) => {
      if (i === index) {
        return { ...edu, [field]: value };
      }
      return edu;
    });
    setEducations(updated);
  };

  const handleRemoveEducation = (index: number) => {
    setEducations(educations.filter((_, i) => i !== index));
  };

  // Project Managers
  const handleAddProject = () => {
    setProjects([
      ...projects,
      { name: "Project Name", technologies: "React, Node.js", link: "", description: "" }
    ]);
  };

  const handleUpdateProject = (index: number, field: keyof Project, value: string) => {
    const updated = projects.map((proj, i) => {
      if (i === index) {
        return { ...proj, [field]: value };
      }
      return proj;
    });
    setProjects(updated);
  };

  const handleRemoveProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  // Tailor Resume triggers
  const handleTailorResume = async () => {
    if (!selectedResumeId) return;
    if (!jobDescription.trim()) {
      toast.error("Please paste a Job Description first.");
      return;
    }

    try {
      const result = await tailorResume({
        id: selectedResumeId,
        job_description: jobDescription
      }).unwrap();
      
      setTailoredProfile(result.tailored_data);
      setTailorPreviewTab("visual");
      toast.success("AI tailored profile generated successfully!");
    } catch (err: any) {
      const errMsg = err?.data?.error || err?.data?.message || err?.message || "Failed to tailor resume.";
      toast.error(errMsg);
    }
  };

  const handleSaveTailoredAsNew = async () => {
    if (!tailoredProfile) return;
    const defaultName = `${selectedResume?.name} (Tailored for ${targetRole || "Role"} at ${targetCompany || "Company"})`;
    const newName = await prompt({
      title: "Save Tailored Resume",
      message: "Enter a name for this new tailored resume profile:",
      defaultValue: defaultName,
      placeholder: "e.g. Resume - Tailored for TechCorp",
    });
    
    if (!newName) return;

    try {
      await createResume({
        name: newName,
        structured_data: tailoredProfile,
        is_default: false
      }).unwrap();
      
      toast.success("New tailored resume profile saved!");
      refetch();
      setTailoredProfile(null);
      setJobDescription("");
      setRightActiveTab("preview");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to save tailored resume.");
    }
  };

  const handleCreateOrUploadResume = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResumeName.trim()) {
      toast.error("Please enter a name for the resume profile.");
      return;
    }

    try {
      if (selectedFile) {
        const formData = new FormData();
        formData.append("name", newResumeName.trim());
        formData.append("file", selectedFile);
        
        await uploadResume(formData).unwrap();
        toast.success("Resume uploaded and parsed successfully!");
      } else {
        await createResume({
          name: newResumeName.trim(),
          structured_data: {
            name: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : "Name",
            email: user?.email || "",
            phone: "",
            github: "",
            linkedin: "",
            portfolio: "",
            summary: "",
            skills: {},
            experience: [],
            education: [],
            projects: []
          }
        }).unwrap();
        toast.success("Empty resume profile created successfully!");
      }
      
      setNewResumeName("");
      setSelectedFile(null);
      setIsManualCreate(false);
      setShowUploadModal(false);
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to create/upload resume.");
    }
  };

  // Helper function to split comma separated skill tags outside parentheses
  const splitSkillsOutsideParentheses = (str: string): string[] => {
    const result: string[] = [];
    let current = "";
    let parenDepth = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      if (char === "(") parenDepth++;
      if (char === ")") parenDepth--;
      if (char === "," && parenDepth === 0) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    if (current.trim()) {
      result.push(current.trim());
    }
    return result;
  };

  // Helper function to dynamically group flat skills list on the fly for the preview & pdf rendering
  const getCategorizedSkills = (skillsData: any): Record<string, string[]> => {
    if (!skillsData) return {};
    
    // If it's already a dictionary/object, return it
    if (typeof skillsData === "object" && !Array.isArray(skillsData)) {
      return skillsData;
    }
    
    // If it's a flat list, let's categorize it on the fly
    const list = Array.isArray(skillsData) ? skillsData : [];
    
    const categorized: Record<string, string[]> = {
      "Languages": [],
      "Framework & Library": [],
      "Miscellaneous Technology": []
    };
    
    const languagesKeywords = [
      "javascript", "typescript", "python", "java", "c++", "c#", "ruby", "php", "swift", "go", "kotlin", "sql", "html", "css", "html5", "css3", "sass", "less", "rust", "scala", "r", "shell"
    ];
    
    const frameworksKeywords = [
      "react", "react native", "react.js", "redux", "node.js", "node", "express.js", "express", "django", "flask", "spring", "laravel", "angular", "vue", "next.js", "nuxt", "nestjs", "tailwind", "tailwindcss", "bootstrap", "jquery", "fastapi", "material ui", "chakra", "graphql", "apollo"
    ];
    
    list.forEach(skill => {
      // Clean prefixes like "Skills: "
      let cleanSkill = skill.trim().replace(/^(skills|languages|frameworks?|libraries|framework\s*&\s*library|tools|technology|technologies|miscellaneous\s*technology)\s*:\s*/i, "");
      if (!cleanSkill) return;
      
      // If the cleanSkill contains multiple items comma separated, split them
      if (cleanSkill.includes(",")) {
        const subSkills = splitSkillsOutsideParentheses(cleanSkill);
        subSkills.forEach(sub => {
          const cleanedSub = sub.trim().replace(/^(skills|languages|frameworks?|libraries|framework\s*&\s*library|tools|technology|technologies|miscellaneous\s*technology)\s*:\s*/i, "");
          if (!cleanedSub) return;
          const lower = cleanedSub.toLowerCase();
          if (languagesKeywords.some(kw => lower.includes(kw))) {
            categorized["Languages"].push(cleanedSub);
          } else if (frameworksKeywords.some(kw => lower.includes(kw))) {
            categorized["Framework & Library"].push(cleanedSub);
          } else {
            categorized["Miscellaneous Technology"].push(cleanedSub);
          }
        });
        return;
      }
      
      const lower = cleanSkill.toLowerCase();
      if (languagesKeywords.some(kw => lower.includes(kw))) {
        categorized["Languages"].push(cleanSkill);
      } else if (frameworksKeywords.some(kw => lower.includes(kw))) {
        categorized["Framework & Library"].push(cleanSkill);
      } else {
        categorized["Miscellaneous Technology"].push(cleanSkill);
      }
    });
    
    // Filter out empty groups
    const result: Record<string, string[]> = {};
    Object.entries(categorized).forEach(([cat, items]) => {
      if (items.length > 0) {
        result[cat] = items;
      }
    });
    
    return result;
  };

  // Plain Markdown generation
  const getMarkdownRepresentation = (data: any) => {
    if (!data) return "";
    let md = `# ${data.name || contactName}\n`;
    if (data.email || data.phone) {
      md += `${data.email || contactEmail} | ${data.phone || contactPhone}\n`;
    }
    if (data.github || github) {
      md += `GitHub: ${data.github || github} | `;
    }
    if (data.linkedin || linkedin) {
      md += `LinkedIn: ${data.linkedin || linkedin} | `;
    }
    if (data.portfolio || portfolio) {
      md += `Portfolio: ${data.portfolio || portfolio}`;
    }
    md += `\n\n`;

    if (data.summary) {
      md += `## Professional Summary\n${data.summary}\n\n`;
    }
    
    const skillsDictCategorized = getCategorizedSkills(data.skills);
    if (Object.keys(skillsDictCategorized).length > 0) {
      md += `## Skills\n`;
      Object.entries(skillsDictCategorized).forEach(([category, items]: any) => {
        md += `* **${category}**: ${items.join(", ")}\n`;
      });
      md += `\n`;
    }
    
    if (data.experience && data.experience.length > 0) {
      md += `## Professional Experience\n`;
      data.experience.forEach((exp: any) => {
        md += `### ${exp.role} - ${exp.company} (${exp.duration})\n${exp.description}\n\n`;
      });
    }
    if (data.education && data.education.length > 0) {
      md += `## Education\n`;
      data.education.forEach((edu: any) => {
        md += `* ${edu.degree}, ${edu.school} (${edu.duration})\n`;
      });
    }
    if (data.projects && data.projects.length > 0) {
      md += `## Projects\n`;
      data.projects.forEach((proj: any) => {
        md += `### ${proj.name} ${proj.technologies ? `(${proj.technologies})` : ""}\n${proj.description}\n\n`;
      });
    }
    return md;
  };

  // Compile Tailored JSON into LaTeX matching selected template style
  const getLatexRepresentation = (data: any, style: "academic" | "minimalist" | "modern" = "academic") => {
    if (!data) return "";
    
    const escapeLatex = (str: string) => {
      if (!str) return "";
      return str
        .replace(/\\/g, '\\textbackslash ')
        .replace(/&/g, '\\&')
        .replace(/%/g, '\\%')
        .replace(/\$/g, '\\$')
        .replace(/#/g, '\\#')
        .replace(/_/g, '\\_')
        .replace(/{/g, '\\{')
        .replace(/}/g, '\\}')
        .replace(/~/g, '\\textasciitilde ')
        .replace(/\^/g, '\\textasciicircum ');
    };

    const cleanBullet = (str: string) => {
      return str.trim().replace(/^[-•▪◦*\d.]+\s*/, "");
    };

    const nameVal = data.name || contactName || "Name";
    const phoneVal = data.phone || contactPhone || "";
    const emailVal = data.email || contactEmail || "";
    
    const rawGithub = data.github || github || "";
    const ghUser = rawGithub.replace(/https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
    
    const rawLinkedin = data.linkedin || linkedin || "";
    const liUser = rawLinkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "");
    
    const portfolioVal = data.portfolio || portfolio || "";

    // Header building based on template style
    let headerLatex = "";
    if (style === "minimalist") {
      const contactParts = [];
      if (phoneVal) contactParts.push(escapeLatex(phoneVal));
      if (emailVal) contactParts.push(`\\href{mailto:${escapeLatex(emailVal)}}{${escapeLatex(emailVal)}}`);
      if (ghUser) contactParts.push(`\\href{https://github.com/${escapeLatex(ghUser)}}{github.com/${escapeLatex(ghUser)}}`);
      if (liUser) contactParts.push(`\\href{https://linkedin.com/in/${escapeLatex(liUser)}}{linkedin.com/in/${escapeLatex(liUser)}}`);
      if (portfolioVal) contactParts.push(`\\href{${escapeLatex(portfolioVal)}}{Portfolio}`);
      
      headerLatex = `\\begin{flushleft}
  {\\Huge \\textbf{${escapeLatex(nameVal)}}} \\\\[4pt]
  \\small ${contactParts.join(" \\quad$\\cdot$\\quad\n")}
\\end{flushleft}
\\vspace{-5pt}\n\n`;
    } else if (style === "modern") {
      const contactParts = [];
      if (phoneVal) contactParts.push(`  \\faIcon{phone} \\href{tel:${escapeLatex(phoneVal)}}{\\underline{${escapeLatex(phoneVal)}}}`);
      if (emailVal) contactParts.push(`  \\faIcon{envelope} \\href{mailto:${escapeLatex(emailVal)}}{\\underline{${escapeLatex(emailVal)}}}`);
      if (ghUser) contactParts.push(`  \\faIcon{github} \\href{https://github.com/${escapeLatex(ghUser)}}{\\underline{${escapeLatex(ghUser)}}}`);
      if (liUser) contactParts.push(`  \\faIcon{linkedin} \\href{https://www.linkedin.com/in/${escapeLatex(liUser)}/}{\\underline{${escapeLatex(liUser)}}}`);
      if (portfolioVal) contactParts.push(`  \\faIcon{globe} \\href{${escapeLatex(portfolioVal)}}{\\underline{Portfolio}}`);

      headerLatex = `\\begin{center}
  \\textbf{\\Huge \\scshape \\color{navy} ${escapeLatex(nameVal)}} \\\\[6pt]
  \\small
${contactParts.join(" \\quad\n")}
\\end{center}
\\vspace{5pt}\n\n`;
    } else { // academic (default)
      const contactParts = [];
      if (phoneVal) contactParts.push(`  \\faIcon{phone} \\href{tel:${escapeLatex(phoneVal)}}{\\underline{${escapeLatex(phoneVal)}}}`);
      if (ghUser) contactParts.push(`  \\faIcon{github} \\href{https://github.com/${escapeLatex(ghUser)}}{\\underline{${escapeLatex(ghUser)}}}`);
      if (liUser) contactParts.push(`  \\faIcon{linkedin} \\href{https://www.linkedin.com/in/${escapeLatex(liUser)}/}{\\underline{${escapeLatex(liUser)}}}`);
      if (emailVal) contactParts.push(`  \\faIcon{envelope} \\href{mailto:${escapeLatex(emailVal)}}{\\underline{${escapeLatex(emailVal)}}}`);
      if (portfolioVal) contactParts.push(`  \\faIcon{globe} \\href{${escapeLatex(portfolioVal)}}{\\underline{Portfolio}}`);

      headerLatex = `\\begin{center}
  \\textbf{\\Huge \\scshape ${escapeLatex(nameVal)}} \\\\[5pt]
\\end{center}
\\begin{center}
  \\small
${contactParts.join(" \\quad\n")}
\\end{center}
\\vspace{5pt}\n\n`;
    }

    // Document setup based on template style
    let latex = "";
    if (style === "minimalist") {
      latex = `\\documentclass[letterpaper,10pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-0.8in}
\\addtolength{\\textheight}{1.6in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large\\bfseries
}{}{0em}{}[\\color{black}\\titrule \\vspace{-4pt}]

\\titleformat{\\subsection}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{\\hspace{-.15in}}{0em}{}[\\color{black}\\vspace{-6pt}]

\\pdfgentounicode=1

% -------------------- CUSTOM COMMANDS --------------------
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & #2 \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]} 
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}} 
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-6pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\setlength{\\footskip}{4pt}

% -------------------- START OF DOCUMENT --------------------
\\begin{document}
`;
    } else if (style === "modern") {
      latex = `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{graphicx}
\\usepackage{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1.0in}
\\addtolength{\\topmargin}{-0.9in}
\\addtolength{\\textheight}{1.7in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

\\definecolor{navy}{HTML}{1e3a8a}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-6pt}\\scshape\\raggedright\\large\\color{navy}
}{\\textbf{#1}}{0em}{}[\\color{navy}\\titrule \\vspace{-5pt}]

\\titleformat{\\subsection}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{\\hspace{-.15in}}{0em}{}[\\color{black}\\vspace{-6pt}]

\\pdfgentounicode=1

% -------------------- CUSTOM COMMANDS --------------------
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & #2 \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]} 
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}} 
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-6pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\setlength{\\footskip}{4pt}

% -------------------- START OF DOCUMENT --------------------
\\begin{document}
`;
    } else { // academic
      latex = `\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{xcolor}
\\usepackage{fontawesome5}
\\usepackage{graphicx}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

% Adjust margins and height
\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-1.1in}
\\addtolength{\\textheight}{1.9in}  % more usable space vertically

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-6pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titrule \\vspace{-5pt}]

\\titleformat{\\subsection}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{\\hspace{-.15in}}{0em}{}[\\color{black}\\vspace{-6pt}]

\\pdfgentounicode=1

% -------------------- CUSTOM COMMANDS --------------------
\\newcommand{\\resumeItem}[1]{\\item\\small{{#1 \\vspace{-2pt}}}}
\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-1pt}\\item
  \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
    \\textbf{#1} & #2 \\\\
    \\textit{\\small#3} & \\textit{\\small #4} \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeSubSubheading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\textit{\\small#1} & \\textit{\\small #2} \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeProjectHeading}[2]{
  \\item
  \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
    \\small#1 & #2 \\\\
  \\end{tabular*}\\vspace{-5pt}
}
\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-3pt}}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]} 
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}} 
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-6pt}}

\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\setlength{\\footskip}{4pt}

% -------------------- START OF DOCUMENT --------------------
\\begin{document}
`;
    }

    latex += headerLatex;

    // Skills Section (Categorized)
    const skillsDictCategorized = getCategorizedSkills(data.skills);
    if (Object.keys(skillsDictCategorized).length > 0) {
      const entries = Object.entries(skillsDictCategorized)
        .map(([category, items]) => {
          const itemsList = Array.isArray(items) ? items : [];
          if (itemsList.length === 0) return "";
          return `    \\textbf{${escapeLatex(category)}}{: ${escapeLatex(itemsList.join(", "))} \\vspace{3pt}}`;
        })
        .filter(Boolean);
        
      if (entries.length > 0) {
        latex += `% -------------------- SKILLS --------------------
\\section{\\textbf{Skills}}
\\begin{itemize}[leftmargin=0.15in, label={}]
  \\small{\\item{
${entries.join(" \\\\\n")}
  }}
\\end{itemize}
\\vspace{5pt}\n\n`;
      }
    }

    // Experience Section
    if (data.experience && data.experience.length > 0) {
      latex += `% -------------------- EXPERIENCE --------------------
\\section{\\textbf{Experience}}
\\resumeSubHeadingListStart\n\n`;

      data.experience.forEach((exp: any) => {
        latex += `\\resumeProjectHeading
  {\\textbf{${escapeLatex(exp.role)}} $|$ \\footnotesize{${escapeLatex(exp.company)}}}{${escapeLatex(exp.duration)}}
  \\resumeItemListStart\n`;
        
        const bulletPoints = (exp.description || "").split("\n").map((b: string) => b.trim()).filter(Boolean);
        if (bulletPoints.length > 0) {
          bulletPoints.forEach((point: string) => {
            latex += `    \\resumeItem{${escapeLatex(cleanBullet(point))}}\n`;
          });
        } else {
          latex += `    \\resumeItem{${escapeLatex(exp.description)}}\n`;
        }

        latex += `  \\resumeItemListEnd\n\n`;
      });

      latex += `\\resumeSubHeadingListEnd\n\\vspace{5pt}\n\n`;
    }

    // Education Section
    if (data.education && data.education.length > 0) {
      latex += `% -------------------- EDUCATION --------------------
\\section{\\textbf{Education}}
\\resumeSubHeadingListStart\n\n`;

      data.education.forEach((edu: any) => {
        latex += `  \\resumeSubheading
  {${escapeLatex(edu.school)}}{${escapeLatex(edu.duration)}}
  {${escapeLatex(edu.degree)}}{${escapeLatex(edu.gpa || "")}}
\n`;
      });

      latex += `\\resumeSubHeadingListEnd\n\\vspace{5pt}\n\n`;
    }

    // Projects Section
    if (data.projects && data.projects.length > 0) {
      latex += `% -------------------- PROJECTS --------------------
\\section{\\textbf{Projects}}
\\resumeSubHeadingListStart\n\n`;

      data.projects.forEach((proj: any) => {
        const titlePart = proj.link 
          ? `\\textbf{\\href{${escapeLatex(proj.link)}}{${escapeLatex(proj.name)}}} $|$ \\footnotesize{${escapeLatex(proj.technologies || "")}}`
          : `\\textbf{${escapeLatex(proj.name)}} $|$ \\footnotesize{${escapeLatex(proj.technologies || "")}}`;
          
        latex += `\\resumeProjectHeading
  {${titlePart}}{}
  \\resumeItemListStart\n`;

        const bulletPoints = (proj.description || "").split("\n").map((b: string) => b.trim()).filter(Boolean);
        if (bulletPoints.length > 0) {
          bulletPoints.forEach((point: string) => {
            latex += `    \\resumeItem{${escapeLatex(cleanBullet(point))}}\n`;
          });
        } else {
          latex += `    \\resumeItem{${escapeLatex(proj.description)}}\n`;
        }

        latex += `  \\resumeItemListEnd\n\n`;
      });

      latex += `\\resumeSubHeadingListEnd\n\n`;
    }

    latex += `\\end{document}\n`;
    return latex;
  };

  const handleCopyMarkdown = (data: any) => {
    const md = getMarkdownRepresentation(data);
    navigator.clipboard.writeText(md);
    toast.success("Markdown copied to clipboard!");
  };

  const handleDownloadMarkdown = (data: any) => {
    const md = getMarkdownRepresentation(data);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedResume?.name || "resume"}_tailored.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLatex = (data: any) => {
    const tex = getLatexRepresentation(data, latexTemplateStyle);
    navigator.clipboard.writeText(tex);
    toast.success("LaTeX template copied to clipboard!");
  };

  const handleDownloadLatex = (data: any) => {
    const tex = getLatexRepresentation(data, latexTemplateStyle);
    const blob = new Blob([tex], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${selectedResume?.name || "resume"}_tailored.tex`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Live print resume compiler triggering Save as PDF
  const handleDownloadPDF = async (data: any) => {
    setIsDownloadingPdf(true);
    const loadingToast = toast.loading("Generating PDF resume...");
    try {
      const isAcademic = latexTemplateStyle === "academic";
      const isModern = latexTemplateStyle === "modern";
      const isMinimalist = latexTemplateStyle === "minimalist";

      const bodyFont = isAcademic ? 'Georgia, "Times New Roman", Times, serif' : 'System-UI, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      const primaryColor = isModern ? '#1e3a8a' : '#000000';
      const headerAlign = isMinimalist ? 'left' : 'center';
      const textTransform = isMinimalist ? 'none' : 'uppercase';
      const contactAlign = isMinimalist ? 'flex-start' : 'center';

      const nameVal = data.name || contactName || "Name";
      const phoneVal = data.phone || contactPhone || "";
      const emailVal = data.email || contactEmail || "";
      const rawGithub = data.github || github || "";
      const ghUser = rawGithub.replace(/https?:\/\/(www\.)?github\.com\//, "").replace(/\/$/, "");
      const rawLinkedin = data.linkedin || linkedin || "";
      const liUser = rawLinkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "").replace(/\/$/, "");
      const portfolioVal = data.portfolio || portfolio || "";

      const contactListItems = [
        phoneVal ? `<span><i class="fas fa-phone"></i>&nbsp;<a href="tel:${phoneVal}">${phoneVal}</a></span>` : "",
        emailVal ? `<span><i class="fas fa-envelope"></i>&nbsp;<a href="mailto:${emailVal}">${emailVal}</a></span>` : "",
        ghUser ? `<span><i class="fab fa-github"></i>&nbsp;<a href="https://github.com/${ghUser}" target="_blank">${ghUser}</a></span>` : "",
        liUser ? `<span><i class="fab fa-linkedin"></i>&nbsp;<a href="https://linkedin.com/in/${liUser}" target="_blank">${liUser}</a></span>` : "",
        portfolioVal ? `<span><i class="fas fa-globe"></i>&nbsp;<a href="${portfolioVal}" target="_blank">Portfolio</a></span>` : ""
      ].filter(Boolean);

      const bulletPoints = (text: string) => {
        return (text || "").split("\n").map(l => l.trim()).filter(Boolean);
      };

      const cleanBullet = (str: string) => {
        return str.replace(/^[-•▪◦*\d.]+\s*/, "");
      };

      let skillsHtml = "";
      const skillsDictCategorized = getCategorizedSkills(data.skills);
      if (Object.keys(skillsDictCategorized).length > 0) {
        skillsHtml = `<div class="section">
          <div class="section-title">Skills</div>
          <div class="skills-list">
            ${Object.entries(skillsDictCategorized).map(([category, items]: any) => {
              const itemsList = Array.isArray(items) ? items : [];
              if (itemsList.length === 0) return "";
              return `
                <div class="skill-row">
                  <span class="skill-category">${category}:</span>
                  <span class="skill-tags">${itemsList.join(", ")}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>`;
      }

      // Add Professional Summary if present
      const summaryHtml = "";

      const experienceHtml = data.experience && data.experience.length > 0
        ? `<div class="section">
             <div class="section-title">Experience</div>
             ${data.experience.map((exp: any) => `
               <div class="resume-item">
                 <div class="item-header">
                   <div>
                     <strong class="item-title">${exp.role}</strong>${exp.company ? ` &nbsp;|&nbsp; <span class="item-detail">${exp.company}</span>` : ""}
                   </div>
                   <span class="item-date">${exp.duration}</span>
                 </div>
                 <ul class="item-list">
                   ${bulletPoints(exp.description).map((b: string) => `<li>${cleanBullet(b)}</li>`).join("")}
                 </ul>
               </div>
             `).join("")}
           </div>`
        : "";

      const educationHtml = data.education && data.education.length > 0
        ? `<div class="section">
             <div class="section-title">Education</div>
             ${data.education.map((edu: any) => `
               <div class="resume-item">
                 <div class="item-header">
                   <strong class="item-title">${edu.school}</strong>
                   <span class="item-date">${edu.duration}</span>
                 </div>
                 <div class="item-sub-header">
                   <span style="font-style: italic;">${edu.degree}</span>
                   ${edu.gpa ? `<span style="font-weight: 500;">${edu.gpa}</span>` : ""}
                 </div>
               </div>
             `).join("")}
           </div>`
        : "";

      const projectsHtml = data.projects && data.projects.length > 0
        ? `<div class="section">
             <div class="section-title">Projects</div>
             ${data.projects.map((proj: any) => `
               <div class="resume-item">
                 <div class="item-header">
                   <div>
                     <strong class="item-title">${proj.name}</strong>${proj.technologies ? ` &nbsp;|&nbsp; <span class="item-detail">${proj.technologies}</span>` : ""}
                   </div>
                   <span class="item-date">${proj.link ? `<a class="item-link" href="${proj.link}" target="_blank">Link</a>` : ""}</span>
                 </div>
                 <ul class="item-list">
                   ${bulletPoints(proj.description).map((b: string) => `<li>${cleanBullet(b)}</li>`).join("")}
                 </ul>
               </div>
             `).join("")}
           </div>`
        : "";

      const html = `<!DOCTYPE html>
        <html>
          <head>
            <title>${nameVal} - Resume</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
            <style>
              @page {
                size: letter;
                margin: 0.22in 0.3in;
              }
              body {
                font-family: ${bodyFont};
                font-size: 8.2pt;
                line-height: 1.25;
                color: #000000;
                margin: 0;
                padding: 0;
                width: 100%;
                max-width: 100%;
              }
              .header-name {
                text-align: ${headerAlign};
                font-size: 15pt;
                font-weight: bold;
                color: ${primaryColor};
                text-transform: ${textTransform};
                letter-spacing: 0.02em;
                margin-bottom: 2px;
              }
              .header-contacts {
                display: flex;
                justify-content: ${contactAlign};
                flex-wrap: nowrap;
                gap: 8px;
                font-size: 7.8pt;
                margin-bottom: 6px;
                align-items: center;
                color: ${primaryColor};
                white-space: nowrap;
              }
              .header-contacts span {
                display: inline-flex;
                align-items: center;
                gap: 3px;
                white-space: nowrap;
              }
              .header-contacts a {
                color: ${primaryColor};
                text-decoration: none;
              }
              .header-contacts a:hover {
                text-decoration: underline;
              }
              .header-contacts i {
                font-size: 7.5pt;
                color: ${primaryColor};
              }
              .header-contacts .separator {
                color: ${primaryColor};
                opacity: 0.7;
                margin: 0;
                font-weight: normal;
              }
              .section {
                margin-top: 13px;
                width: 100%;
              }
              .section-title {
                font-size: 9.5pt;
                font-weight: bold;
                color: ${primaryColor};
                border-bottom: 1px solid ${primaryColor};
                margin-bottom: 5px;
                padding-bottom: 1px;
                text-transform: uppercase;
                letter-spacing: 0.04em;
              }
              .skills-list {
                font-size: 8.2pt;
                margin-top: 2px;
                margin-left: 4px;
                display: flex;
                flex-direction: column;
                gap: 2px;
              }
              .skill-row {
                text-align: left;
                line-height: 1.25;
              }
              .skill-category {
                font-weight: bold;
                color: #000000;
              }
              .skill-tags {
                color: #000000;
              }
              .resume-item {
                margin-bottom: 6px;
              }
              .item-header {
                display: flex;
                justify-content: space-between;
                font-size: 8.4pt;
                margin-top: 3px;
                color: #000000;
                margin-left: 4px;
              }
              .item-title {
                font-weight: bold;
              }
              .item-detail {
                font-weight: normal;
                font-size: 8.0pt;
              }
              .item-date {
                font-weight: normal;
                font-style: italic;
                color: #333333;
                font-size: 8.0pt;
              }
              .item-sub-header {
                display: flex;
                justify-content: space-between;
                font-size: 8.0pt;
                color: #333333;
                margin-top: 0.5px;
                margin-left: 4px;
              }
              .item-list {
                margin-top: 2px;
                margin-bottom: 3px;
                padding-left: 14px;
                list-style-type: disc;
                color: #000000;
              }
              .item-list li {
                font-size: 8.2pt;
                margin-bottom: 1.8px;
                line-height: 1.25;
                text-align: justify;
              }
              .item-link {
                color: #000000;
                text-decoration: underline;
              }
            </style>
          </head>
          <body>
            <div class="header-name">${nameVal}</div>
            <div class="header-contacts">
              ${contactListItems.join(' <span class="separator">&bull;</span> ')}
            </div>

            ${summaryHtml}
            ${skillsHtml}
            ${experienceHtml}
            ${educationHtml}
            ${projectsHtml}
          </body>
        </html>
      `;

      // Call API compile_pdf
      const response = await fetch(`${API_BASE_URL}/auth/resumes/compile_pdf/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          html: html,
          filename: `${selectedResume?.name || "resume"}_${latexTemplateStyle}.pdf`
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate PDF from server");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${selectedResume?.name || "resume"}_${latexTemplateStyle}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("PDF Resume downloaded successfully!", { id: loadingToast });
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to download PDF resume.", { id: loadingToast });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Compile active edit fields state into current resume payload
  const getActiveProfilePayload = () => {
    return {
      name: contactName,
      email: contactEmail,
      phone: contactPhone,
      github,
      linkedin,
      portfolio,
      summary,
      skills: skillsDict,
      experience: experiences,
      education: educations,
      projects
    };
  };

  const renderSkillsVisual = (skillsData: any) => {
    const skillsDictCategorized = getCategorizedSkills(skillsData);
    const entries = Object.entries(skillsDictCategorized);
    if (entries.length === 0) return null;
    
    const isAcademic = latexTemplateStyle === "academic";
    const isModern = latexTemplateStyle === "modern";

    return (
      <div className="mt-2">
        <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 ${isAcademic ? "font-serif" : "font-sans"} text-left uppercase tracking-wide`}>
          Skills
        </div>
        <div className={`text-[8.2pt] ${isAcademic ? "font-serif" : "font-sans"} pl-2`}>
          {entries.map(([category, items]: any, idx) => {
            const itemsList = Array.isArray(items) ? items : [];
            if (itemsList.length === 0) return null;
            return (
              <div key={idx} className="text-left leading-snug">
                <span className="font-bold text-black">{category}:</span>{" "}
                <span className="text-black">{itemsList.join(", ")}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8 animate-fade-in pb-12"
    >
      {/* ─── SCENARIO 1: ACTIVE DETAILED WORKSPACE VIEW ─── */}
      {selectedResumeId && selectedResume ? (
        <div className="space-y-6">
          {/* Workspace Workspace Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-rose-border">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedResumeId(null)}
                className="btn-secondary p-2.5 flex items-center justify-center"
                title="Back to list"
              >
                <ArrowLeft size={16} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={resumeNameEdit}
                    onChange={(e) => setResumeNameEdit(e.target.value)}
                    className="text-2xl font-extrabold text-rose-text bg-transparent border-b-2 border-transparent hover:border-rose-hl-high focus:border-rose-pine outline-none max-w-sm px-1 py-0.5 rounded-none"
                  />
                  <Edit3 size={16} className="text-rose-muted" />
                </div>
                <p className="text-xs text-rose-muted font-medium ml-1">
                  Created {formatDate(selectedResume.created_at)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleParseResume} 
                disabled={isParsing || isUpdating}
                className="btn-secondary flex items-center gap-2 border-2 border-rose-border bg-rose-overlay/40 hover:bg-rose-overlay text-rose-text"
                title="Run AI Parser on this resume"
              >
                {isParsing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} className="text-rose-gold fill-rose-gold/20" />}
                Parse with AI
              </button>
              <button 
                onClick={handleSaveChanges} 
                disabled={isUpdating || isParsing}
                className="btn-primary flex items-center gap-2 bg-rose-foam text-white"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Changes
              </button>
              <button
                onClick={() => handleDelete(selectedResume.id, selectedResume.name)}
                disabled={isDeleting || isParsing}
                className="btn-secondary hover:bg-rose-love/10 hover:text-rose-love p-2.5 flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Workspace Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Structured Form Inputs (7 cols) */}
            <div className="lg:col-span-7 card bg-rose-surface p-6 space-y-6">
              
              {/* Profile Editor Tabs */}
              <div className="flex border-b-2 border-rose-border bg-rose-overlay/40 px-3 py-2 gap-2 -mx-6 -mt-6 mb-6 overflow-x-auto shrink-0">
                {[
                  { id: "contact", label: "Contact & Links", icon: User },
                  { id: "skills", label: "Skills", icon: Briefcase },
                  { id: "experience", label: "Experience", icon: Briefcase },
                  { id: "education", label: "Education", icon: FileText },
                  { id: "projects", label: "Projects", icon: Code },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id as any)}
                    className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all shrink-0 flex items-center gap-1.5 ${
                      activeTab === t.id 
                        ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]" 
                        : "text-rose-muted border-transparent hover:text-rose-text hover:bg-rose-surface/50"
                    }`}
                  >
                    <t.icon size={13} />
                    {t.label}
                  </button>
                ))}
              </div>

              {(!selectedResume?.structured_data || Object.keys(selectedResume.structured_data).length === 0) && (
                <div className="p-4 bg-rose-gold/10 border-2 border-rose-gold text-rose-gold font-bold text-xs space-y-2 mb-2">
                  <p className="flex items-center gap-1.5 font-extrabold uppercase">
                    <Sparkles size={16} className="text-rose-gold" /> Unparsed Resume Profile
                  </p>
                  <p className="font-semibold text-[11px] leading-relaxed text-rose-subtle">
                    This resume profile has not been parsed into structured fields yet. Run the AI parser to extract contact details, skills, experience, and education automatically.
                  </p>
                  <button
                    type="button"
                    onClick={handleParseResume}
                    disabled={isParsing}
                    className="btn-primary py-1 px-3 bg-rose-gold border-rose-border text-rose-text text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5"
                  >
                    {isParsing ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                    Parse Profile Now
                  </button>
                </div>
              )}

              {/* Tab Contents */}
              <div className="space-y-4 min-h-[400px]">
                
                {/* Contact Tab */}
                {activeTab === "contact" && (
                  <div className="space-y-4">
                    <h3 className="font-extrabold text-sm text-rose-text border-b border-rose-border pb-2 flex items-center gap-2">
                      <User size={16} className="text-rose-pine" /> Contact Info & Socials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="label">Full Name</label>
                        <input
                          type="text"
                          value={contactName}
                          onChange={(e) => setContactName(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. Abhishek Tiwari"
                        />
                      </div>
                      <div>
                        <label className="label">Email Address</label>
                        <input
                          type="email"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. abhitiwariabhi7@gmail.com"
                        />
                      </div>
                      <div>
                        <label className="label">Phone Number</label>
                        <input
                          type="text"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. 626-8393-044"
                        />
                      </div>
                      <div>
                        <label className="label">GitHub Username/URL</label>
                        <input
                          type="text"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. Itz-Abhishek-Tiwari"
                        />
                      </div>
                      <div>
                        <label className="label">LinkedIn Username/URL</label>
                        <input
                          type="text"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. itz-abhishek-tiwari"
                        />
                      </div>
                      <div>
                        <label className="label">Portfolio Website URL</label>
                        <input
                          type="text"
                          value={portfolio}
                          onChange={(e) => setPortfolio(e.target.value)}
                          className="input w-full py-1.5 text-xs"
                          placeholder="e.g. https://itz-abhishek-tiwari.netlify.app/"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 mt-6">
                      <h3 className="font-extrabold text-sm text-rose-text border-b border-rose-border pb-2">
                        Professional Summary
                      </h3>
                      <textarea
                        value={summary}
                        onChange={(e) => setSummary(e.target.value)}
                        className="input w-full min-h-[120px] text-xs font-medium leading-relaxed resize-y"
                        placeholder="Describe your career history, goals, and key achievements..."
                      />
                    </div>
                  </div>
                )}

                {/* Skills Tab */}
                {activeTab === "skills" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b-2 border-rose-border pb-3 gap-2">
                      <h3 className="font-extrabold text-sm text-rose-text">
                        Technical & Core Skills (Categorized)
                      </h3>
                      
                      {/* Add new skill category form */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                          className="input text-xs py-1.5 px-2.5 max-w-[200px]"
                          placeholder="Category (e.g. Languages)..."
                        />
                        <button 
                          onClick={handleAddCategory}
                          className="btn-primary py-1 px-3 bg-rose-foam text-xs flex items-center gap-1"
                        >
                          <Plus size={13} /> Category
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {Object.keys(skillsDict).length === 0 ? (
                        <p className="text-xs text-rose-muted italic text-center py-6 font-medium">
                          No skill categories added yet. Add a category above (e.g. Languages) to begin structuring your skills!
                        </p>
                      ) : (
                        Object.entries(skillsDict).map(([category, items]) => (
                          <div key={category} className="p-4 bg-rose-overlay/40 border-2 border-rose-border space-y-3 relative group rounded-none shadow-[3px_3px_0px_0px_var(--color-hl-low)]">
                            
                            {/* Delete category button */}
                            <button
                              onClick={() => handleRemoveCategory(category)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border border-transparent text-rose-muted hover:text-rose-love hover:border-rose-love transition-colors rounded-none"
                              title={`Delete category "${category}"`}
                            >
                              <Trash2 size={13} />
                            </button>
                            
                            <h4 className="font-extrabold text-xs text-rose-gold uppercase tracking-wider pr-8">{category}</h4>
                            
                            {/* Add Skill tag input */}
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newSkillInput[category] || ""}
                                onChange={(e) => setNewSkillInput({
                                  ...newSkillInput,
                                  [category]: e.target.value
                                })}
                                onKeyDown={(e) => e.key === "Enter" && handleAddSkillToCategory(category)}
                                className="input flex-1 py-1 text-xs"
                                placeholder={`Add skill to "${category}"...`}
                              />
                              <button
                                onClick={() => handleAddSkillToCategory(category)}
                                className="btn-primary py-1 px-4 bg-rose-pine text-xs"
                              >
                                Add
                              </button>
                            </div>

                            {/* Tags list */}
                            <div className="flex flex-wrap gap-2 pt-1">
                              {items.length === 0 ? (
                                <p className="text-[10px] text-rose-muted italic">No skill tags added to this category.</p>
                              ) : (
                                items.map((tag) => (
                                  <div 
                                    key={tag}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none font-bold text-[10px] bg-rose-surface border-2 border-rose-border text-rose-text shadow-[2px_2px_0px_0px_var(--color-hl-high)]"
                                  >
                                    <span>{tag}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSkillFromCategory(category, tag)}
                                      className="text-rose-muted hover:text-rose-love focus:outline-none"
                                    >
                                      <X size={10} className="stroke-[2.5]" />
                                    </button>
                                  </div>
                                ))
                              )}
                            </div>

                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Experience Tab */}
                {activeTab === "experience" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rose-border pb-2">
                      <h3 className="font-extrabold text-sm text-rose-text">
                        Work Experience
                      </h3>
                      <button 
                        onClick={handleAddExperience}
                        className="btn-primary py-1 px-3 bg-rose-foam text-xs flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Role
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {experiences.length === 0 ? (
                        <p className="text-xs text-rose-muted italic text-center py-6 font-medium">No experiences added yet.</p>
                      ) : (
                        experiences.map((exp, idx) => (
                          <div key={idx} className="p-4 bg-rose-overlay/40 border-2 border-rose-border space-y-3 relative group rounded-none shadow-[3px_3px_0px_0px_var(--color-hl-low)]">
                            <button
                              onClick={() => handleRemoveExperience(idx)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border border-transparent text-rose-muted hover:text-rose-love hover:border-rose-love transition-colors rounded-none"
                              title="Delete entry"
                            >
                              <Trash2 size={13} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-2">
                                <label className="label">Job Title / Role</label>
                                <input
                                  type="text"
                                  value={exp.role}
                                  onChange={(e) => handleUpdateExperience(idx, "role", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. Software Engineer"
                                />
                              </div>
                              <div>
                                <label className="label">Duration</label>
                                <input
                                  type="text"
                                  value={exp.duration}
                                  onChange={(e) => handleUpdateExperience(idx, "duration", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. Mar 2025 -- Present"
                                />
                              </div>
                              <div className="md:col-span-3">
                                <label className="label">Company</label>
                                <input
                                  type="text"
                                  value={exp.company}
                                  onChange={(e) => handleUpdateExperience(idx, "company", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. Thoughtwin IT Solution"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Achievements & Responsibilities</label>
                              <textarea
                                value={exp.description}
                                onChange={(e) => handleUpdateExperience(idx, "description", e.target.value)}
                                className="input w-full text-xs min-h-[100px] leading-relaxed resize-y font-mono"
                                placeholder="Describe your achievements (each line will be exported as a LaTeX \resumeItem)..."
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Education Tab */}
                {activeTab === "education" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rose-border pb-2">
                      <h3 className="font-extrabold text-sm text-rose-text">
                        Education & Credentials
                      </h3>
                      <button 
                        onClick={handleAddEducation}
                        className="btn-primary py-1 px-3 bg-rose-foam text-xs flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Education
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {educations.length === 0 ? (
                        <p className="text-xs text-rose-muted italic text-center py-6 font-medium">No education credentials added yet.</p>
                      ) : (
                        educations.map((edu, idx) => (
                          <div key={idx} className="p-4 bg-rose-overlay/40 border-2 border-rose-border space-y-3 relative group rounded-none shadow-[3px_3px_0px_0px_var(--color-hl-low)]">
                            <button
                              onClick={() => handleRemoveEducation(idx)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border border-transparent text-rose-muted hover:text-rose-love hover:border-rose-love transition-colors rounded-none"
                              title="Delete entry"
                            >
                              <Trash2 size={13} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="md:col-span-2">
                                <label className="label">School / Institution</label>
                                <input
                                  type="text"
                                  value={edu.school}
                                  onChange={(e) => handleUpdateEducation(idx, "school", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. Shivajirao Kadam Institute Of Technology And Management, Indore"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label">Degree / Program</label>
                                <input
                                  type="text"
                                  value={edu.degree}
                                  onChange={(e) => handleUpdateEducation(idx, "degree", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. B.Tech Computer Science"
                                />
                              </div>
                              <div>
                                <label className="label">Duration</label>
                                <input
                                  type="text"
                                  value={edu.duration}
                                  onChange={(e) => handleUpdateEducation(idx, "duration", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. JUNE 2020 - JUNE 2024"
                                />
                              </div>
                              <div>
                                <label className="label">GPA / Grade (Optional)</label>
                                <input
                                  type="text"
                                  value={edu.gpa || ""}
                                  onChange={(e) => handleUpdateEducation(idx, "gpa", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. CGPA: 8.07 or Grade - XII"
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {/* Projects Tab */}
                {activeTab === "projects" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rose-border pb-2">
                      <h3 className="font-extrabold text-sm text-rose-text">
                        Projects
                      </h3>
                      <button 
                        onClick={handleAddProject}
                        className="btn-primary py-1 px-3 bg-rose-foam text-xs flex items-center gap-1"
                      >
                        <Plus size={14} /> Add Project
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {projects.length === 0 ? (
                        <p className="text-xs text-rose-muted italic text-center py-6 font-medium">No projects added yet.</p>
                      ) : (
                        projects.map((proj, idx) => (
                          <div key={idx} className="p-4 bg-rose-overlay/40 border-2 border-rose-border space-y-3 relative group rounded-none shadow-[3px_3px_0px_0px_var(--color-hl-low)]">
                            <button
                              onClick={() => handleRemoveProject(idx)}
                              className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center border border-transparent text-rose-muted hover:text-rose-love hover:border-rose-love transition-colors rounded-none"
                              title="Delete project"
                            >
                              <Trash2 size={13} />
                            </button>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="label">Project Name</label>
                                <input
                                  type="text"
                                  value={proj.name}
                                  onChange={(e) => handleUpdateProject(idx, "name", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. Wasalt - Real Estate Platform"
                                />
                              </div>
                              <div>
                                <label className="label">Technologies Used</label>
                                <input
                                  type="text"
                                  value={proj.technologies || ""}
                                  onChange={(e) => handleUpdateProject(idx, "technologies", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. React Native, Redux"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="label">Project URL / Link</label>
                                <input
                                  type="text"
                                  value={proj.link || ""}
                                  onChange={(e) => handleUpdateProject(idx, "link", e.target.value)}
                                  className="input w-full py-1 text-xs"
                                  placeholder="e.g. https://play.google.com/store/apps/details?id=com.mtp.organiser"
                                />
                              </div>
                            </div>
                            <div>
                              <label className="label">Project Details / Accomplishments</label>
                              <textarea
                                value={proj.description}
                                onChange={(e) => handleUpdateProject(idx, "description", e.target.value)}
                                className="input w-full text-xs min-h-[100px] leading-relaxed resize-y font-mono"
                                placeholder="Describe the project achievements (each line will be exported as a LaTeX \resumeItem)..."
                              />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* RIGHT COLUMN: Interactive Preview & AI Tailor View tabs (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Workspace Navigation Header Tab toggler */}
              <div className="flex border-b-2 border-rose-border bg-rose-overlay/40 px-3 py-2 gap-2 -mx-5 -mt-5 mb-5 shrink-0">
                <button
                  type="button"
                  onClick={() => setRightActiveTab("preview")}
                  className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all flex items-center justify-center gap-2 ${
                    rightActiveTab === "preview"
                      ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                      : "text-rose-muted border-transparent hover:text-rose-text"
                  }`}
                >
                  <Eye size={14} /> Resume Preview
                </button>
                <button
                  type="button"
                  onClick={() => setRightActiveTab("tailor")}
                  className={`flex-1 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all flex items-center justify-center gap-2 ${
                    rightActiveTab === "tailor"
                      ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                      : "text-rose-muted border-transparent hover:text-rose-text"
                  }`}
                >
                  <Sparkles size={14} /> Tailor with AI
                </button>
              </div>

              {/* ─── TAB 1: PERSISTENT PREVIEW FOR SAVED PROFILE ─── */}
              {rightActiveTab === "preview" && (
                <div className="card bg-rose-surface p-5 space-y-4">
                  <div className="flex items-center justify-between border-b-2 border-rose-border pb-2 gap-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-pine flex items-center gap-1.5">
                      <FileText size={14} /> Document Preview
                    </h4>
                    
                    {/* Actions Toolbar */}
                    <div className="flex items-center gap-2">
                      {(previewSubTab === "visual" || previewSubTab === "latex") && (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPreviewStyleDropdown(!showPreviewStyleDropdown)}
                            className="px-2 py-1 text-[9px] font-extrabold uppercase border-2 border-rose-border bg-rose-surface hover:bg-rose-overlay/40 transition-all flex items-center gap-1 cursor-pointer select-none"
                          >
                            {latexTemplateStyle === "academic" && "Academic"}
                            {latexTemplateStyle === "minimalist" && "Minimalist"}
                            {latexTemplateStyle === "modern" && "Modern"}
                            <ChevronDown size={10} className={`transform transition-transform ${showPreviewStyleDropdown ? "rotate-180" : ""}`} />
                          </button>
                          {showPreviewStyleDropdown && (
                            <div className="absolute right-0 mt-1 z-[110] bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] min-w-[130px] overflow-hidden">
                              {[
                                { id: "academic", label: "Academic Serif" },
                                { id: "minimalist", label: "Classic Minimalist" },
                                { id: "modern", label: "Modern Technical" }
                              ].map((opt) => (
                                <div
                                  key={opt.id}
                                  onClick={() => {
                                    setLatexTemplateStyle(opt.id as any);
                                    setShowPreviewStyleDropdown(false);
                                  }}
                                  className={`text-[9.5px] font-extrabold px-3 py-1.5 hover:bg-rose-overlay cursor-pointer text-left border-b last:border-b-0 border-rose-border/20 select-none ${
                                    latexTemplateStyle === opt.id ? "bg-rose-pine/10 text-rose-pine" : "text-rose-text"
                                  }`}
                                >
                                  {opt.label}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {previewSubTab === "visual" && (
                        <button 
                          onClick={() => handleDownloadPDF(getActiveProfilePayload())}
                          disabled={isDownloadingPdf}
                          className="btn-primary py-1 px-2.5 bg-rose-pine text-white text-[10px] font-extrabold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Download PDF"
                        >
                          {isDownloadingPdf ? (
                            <Loader2 className="animate-spin" size={11} />
                          ) : (
                            <Download size={11} />
                          )}
                          Download PDF
                        </button>
                      )}
                      {previewSubTab === "latex" && (
                        <>
                          <button 
                            onClick={() => handleCopyLatex(getActiveProfilePayload())}
                            className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                            title="Copy LaTeX (.tex)"
                          >
                            <Copy size={11} />
                          </button>
                          <button 
                            onClick={() => handleDownloadLatex(getActiveProfilePayload())}
                            className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                            title="Download LaTeX (.tex)"
                          >
                            <Download size={11} />
                          </button>
                        </>
                      )}
                      {previewSubTab === "markdown" && (
                        <>
                          <button 
                            onClick={() => handleCopyMarkdown(getActiveProfilePayload())}
                            className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                            title="Copy Markdown"
                          >
                            <Copy size={11} />
                          </button>
                          <button 
                            onClick={() => handleDownloadMarkdown(getActiveProfilePayload())}
                            className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                            title="Download Markdown"
                          >
                            <Download size={11} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sub-tab view selections */}
                  <div className="flex border-b-2 border-rose-border bg-rose-overlay/40 px-3 py-2 gap-2 -mx-5 mb-4 shrink-0">
                    {[
                      { id: "visual", label: "Visual Preview", icon: Eye },
                      { id: "latex", label: "LaTeX Code", icon: Code },
                      { id: "markdown", label: "Markdown", icon: FileText }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setPreviewSubTab(tab.id as any)}
                        className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all flex items-center gap-1.5 ${
                          previewSubTab === tab.id
                            ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                            : "text-rose-muted border-transparent hover:text-rose-text"
                        }`}
                      >
                        <tab.icon size={12} />
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Document View Panels */}
                  <div>
                    {previewSubTab === "visual" ? (
                      (() => {
                        const isAcademic = latexTemplateStyle === "academic";
                        const isModern = latexTemplateStyle === "modern";
                        const isMinimalist = latexTemplateStyle === "minimalist";

                        return (
                          <div className={`bg-white border-2 border-rose-border px-6 pt-5 pb-2 text-black ${isAcademic ? "font-serif" : "font-sans"} text-[8.2pt] leading-snug max-w-[650px] mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none rounded-none`}>
                            <div className={`uppercase tracking-wide mb-0.5 ${isMinimalist ? "text-left font-bold text-[16pt]" : "text-center font-bold text-[15pt]"} ${isModern ? "text-blue-900" : "text-black"}`}>
                              {contactName || "Name"}
                            </div>
                            {(() => {
                              const contactSpans = [];
                              if (contactPhone) {
                                contactSpans.push(
                                  <span key="phone" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <Phone size={8} className="stroke-[2.5]" />
                                    <a href={`tel:${contactPhone}`} className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{contactPhone}</a>
                                  </span>
                                );
                              }
                              if (github) {
                                contactSpans.push(
                                  <span key="github" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <Github size={8} className="stroke-[2.5]" />
                                    <a href={`https://github.com/${github.replace(/https?:\/\/(www\.)?github\.com\//, "")}`} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{github.replace(/https?:\/\/(www\.)?github\.com\//, "")}</a>
                                  </span>
                                );
                              }
                              if (linkedin) {
                                contactSpans.push(
                                  <span key="linkedin" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <Linkedin size={8} className="stroke-[2.5]" />
                                    <a href={`https://linkedin.com/in/${linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "")}`} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</a>
                                  </span>
                                );
                              }
                              if (contactEmail) {
                                contactSpans.push(
                                  <span key="email" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <Mail size={8} className="stroke-[2.5]" />
                                    <a href={`mailto:${contactEmail}`} className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{contactEmail}</a>
                                  </span>
                                );
                              }
                              if (portfolio) {
                                contactSpans.push(
                                  <span key="portfolio" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                    <Globe size={8} className="stroke-[2.5]" />
                                    <a href={portfolio} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>Portfolio</a>
                                  </span>
                                );
                              }

                              return (
                                <div className={`text-[7.8pt] flex flex-row flex-nowrap whitespace-nowrap gap-x-1.5 pb-0.5 mb-1.5 items-center w-full overflow-hidden text-ellipsis justify-center ${isMinimalist ? "!justify-start text-left" : "justify-center text-center"} ${isModern ? "text-blue-900" : "text-black"}`}>
                                  {contactSpans.reduce((acc: any[], item: any, idx: number) => {
                                    if (idx > 0) {
                                      acc.push(<span key={`sep-${idx}`} className={`text-gray-400 select-none`}>&bull;</span>);
                                    }
                                    acc.push(item);
                                    return acc;
                                  }, [])}
                                </div>
                              );
                            })()}



                            {/* Skills */}
                            {renderSkillsVisual(skillsDict)}

                            {/* Experience */}
                            {experiences.length > 0 && (
                              <div className="mt-2">
                                <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Experience</div>
                                {experiences.map((exp, idx) => (
                                  <div key={idx} className="mb-1.5 text-left pl-2">
                                    <div className="flex justify-between text-[8.4pt] text-black">
                                      <span>
                                        <span className="font-bold">{exp.role}</span>
                                        {exp.company && ` | ${exp.company}`}
                                      </span>
                                      <span className="font-normal italic text-[8.0pt] text-gray-700">{exp.duration}</span>
                                    </div>
                                    <ul className="list-disc pl-4 mt-0 text-[8.2pt] text-black">
                                      {exp.description.split("\n").map(b => b.trim()).filter(Boolean).map((bullet, bIdx) => (
                                        <li key={bIdx} className="leading-snug text-justify">{bullet.replace(/^[-•▪◦*\d.]+\s*/, "")}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Education */}
                            {educations.length > 0 && (
                              <div className="mt-2">
                                <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Education</div>
                                {educations.map((edu, idx) => (
                                  <div key={idx} className="mb-1 text-left pl-2">
                                    <div className="flex justify-between text-[8.4pt] text-black">
                                      <span className="font-bold">{edu.school}</span>
                                      <span className="font-normal italic text-[8.0pt] text-gray-700">{edu.duration}</span>
                                    </div>
                                    <div className="flex justify-between text-[8.0pt] text-gray-700">
                                      <span className="italic">{edu.degree}</span>
                                      {edu.gpa && <span className="font-medium text-black">{edu.gpa}</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Projects */}
                            {projects.length > 0 && (
                              <div className="mt-2">
                                <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Projects</div>
                                {projects.map((proj, idx) => (
                                  <div key={idx} className="mb-1.5 text-left pl-2">
                                    <div className="flex justify-between text-[8.4pt] text-black">
                                      <span>
                                        <span className="font-bold">{proj.name}</span>
                                        {proj.technologies && ` | ${proj.technologies}`}
                                      </span>
                                      <span className="font-normal italic text-[8.0pt] text-gray-700">{proj.link ? <a href={proj.link} target="_blank" rel="noreferrer" className="text-black underline">Link</a> : ""}</span>
                                    </div>
                                    <ul className="list-disc pl-4 mt-0 text-[8.2pt] text-black">
                                      {proj.description.split("\n").map(b => b.trim()).filter(Boolean).map((bullet, bIdx) => (
                                        <li key={bIdx} className="leading-snug text-justify">{bullet.replace(/^[-•▪◦*\d.]+\s*/, "")}</li>
                                      ))}
                                    </ul>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })()
                    ) : previewSubTab === "latex" ? (
                      <div className="space-y-2">
                        <textarea
                          readOnly
                          value={getLatexRepresentation(getActiveProfilePayload(), latexTemplateStyle)}
                          className="input w-full h-[300px] text-[10px] font-mono leading-relaxed bg-rose-surface border border-rose-hl-high outline-none p-2 resize-none"
                          onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3 text-xs leading-relaxed">
                        <div>
                          <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Bio Summary</h5>
                          <p className="bg-rose-surface p-3 border border-rose-hl-high font-medium text-rose-subtle">{summary}</p>
                        </div>
                        {Object.keys(skillsDict).length > 0 && (
                          <div>
                            <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Skills</h5>
                            <div className="space-y-2">
                              {Object.entries(skillsDict).map(([cat, tags]) => (
                                <div key={cat} className="bg-rose-surface p-2 border border-rose-hl-high">
                                  <strong className="text-rose-pine text-[11px] uppercase">{cat}</strong>
                                  <p className="text-[10px] text-rose-muted mt-0.5">{tags.join(", ")}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {experiences.length > 0 && (
                          <div>
                            <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Experiences</h5>
                            <div className="space-y-2">
                              {experiences.map((exp, idx) => (
                                <div key={idx} className="bg-rose-surface p-2 border border-rose-hl-high font-medium">
                                  <p className="font-extrabold text-rose-text text-[11px]">{exp.role} @ {exp.company}</p>
                                  <p className="font-mono text-[10px] text-rose-muted mt-0.5 whitespace-pre-line leading-normal">{exp.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 2: AI WRITER & TAILOR WORKSPACE ─── */}
              {rightActiveTab === "tailor" && (
                <div className="space-y-6">
                  
                  {/* Warning if Gemini API key is missing */}
                  {!user?.has_gemini_api_key && (
                    <div className="p-4 bg-rose-love/15 border-2 border-rose-love text-rose-love font-bold text-xs space-y-2">
                      <p className="flex items-center gap-1.5 font-extrabold uppercase">
                        <XCircle size={16} /> Gemini API Key Missing
                      </p>
                      <p className="font-semibold text-[11px] leading-relaxed">
                        AI tailoring requires a Gemini API Key. Please add one under Settings.
                      </p>
                    </div>
                  )}

                  {/* JD Input workspace card */}
                  <div className="card bg-rose-surface p-6 space-y-4">
                    <h3 className="font-extrabold text-sm text-rose-text flex items-center gap-2">
                      <Sparkles size={16} className="text-rose-gold fill-rose-gold/20" />
                      AI Resume Writer & Tailor
                    </h3>
                    <p className="text-[10px] text-rose-muted font-bold leading-normal">
                      Paste the job description of the role you are targeting. Gemini will rewrite the summary, keywords, and job description bullet points to highlight your relevant accomplishments.
                    </p>

                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label text-[10px]">Target Company</label>
                          <input
                            type="text"
                            value={targetCompany}
                            onChange={(e) => setTargetCompany(e.target.value)}
                            className="input w-full py-1 text-xs"
                            placeholder="e.g. Thoughtwin"
                          />
                        </div>
                        <div>
                          <label className="label text-[10px]">Target Role</label>
                          <input
                            type="text"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            className="input w-full py-1 text-xs"
                            placeholder="e.g. Software Engineer"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="label text-[10px]">Job Description Text</label>
                        <textarea
                          value={jobDescription}
                          onChange={(e) => setJobDescription(e.target.value)}
                          className="input w-full min-h-[140px] text-xs font-mono"
                          placeholder="Paste the key job requirements, description, or qualifications here..."
                        />
                      </div>

                      <button
                        onClick={handleTailorResume}
                        disabled={isTailoring || !user?.has_gemini_api_key || !jobDescription.trim()}
                        className="btn-primary w-full py-2.5 bg-rose-gold border-rose-border text-rose-text font-extrabold flex items-center justify-center gap-2"
                      >
                        {isTailoring ? (
                          <>
                            <Loader2 className="animate-spin" size={15} /> Tailoring Profile...
                          </>
                        ) : (
                          <>
                            <Sparkles size={15} /> Tailor Resume for JD
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Tailoring results workspace */}
                  <AnimatePresence>
                    {tailoredProfile && (
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 15 }}
                        className="card border-rose-gold bg-rose-surface p-5 space-y-4"
                      >
                        <div className="flex items-center justify-between border-b-2 border-rose-border pb-2 gap-2">
                          <h4 className="font-extrabold text-xs uppercase tracking-wider text-rose-gold flex items-center gap-1.5">
                            <Check size={14} className="stroke-[3]" /> Tailored Resume Generated
                          </h4>
                          
                          {/* Tailored Actions Toolbar */}
                          <div className="flex items-center gap-2">
                            {(tailorPreviewTab === "visual" || tailorPreviewTab === "latex") && (
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowTailorStyleDropdown(!showTailorStyleDropdown)}
                                  className="px-2 py-1 text-[9px] font-extrabold uppercase border-2 border-rose-border bg-rose-surface hover:bg-rose-overlay/40 transition-all flex items-center gap-1 cursor-pointer select-none"
                                >
                                  {latexTemplateStyle === "academic" && "Academic"}
                                  {latexTemplateStyle === "minimalist" && "Minimalist"}
                                  {latexTemplateStyle === "modern" && "Modern"}
                                  <ChevronDown size={10} className={`transform transition-transform ${showTailorStyleDropdown ? "rotate-180" : ""}`} />
                                </button>
                                {showTailorStyleDropdown && (
                                  <div className="absolute right-0 mt-1 z-[110] bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] min-w-[130px] overflow-hidden">
                                    {[
                                      { id: "academic", label: "Academic Serif" },
                                      { id: "minimalist", label: "Classic Minimalist" },
                                      { id: "modern", label: "Modern Technical" }
                                    ].map((opt) => (
                                      <div
                                        key={opt.id}
                                        onClick={() => {
                                          setLatexTemplateStyle(opt.id as any);
                                          setShowTailorStyleDropdown(false);
                                        }}
                                        className={`text-[9.5px] font-extrabold px-3 py-1.5 hover:bg-rose-overlay cursor-pointer text-left border-b last:border-b-0 border-rose-border/20 select-none ${
                                          latexTemplateStyle === opt.id ? "bg-rose-pine/10 text-rose-pine" : "text-rose-text"
                                        }`}
                                      >
                                        {opt.label}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {tailorPreviewTab === "visual" && (
                              <button 
                                onClick={() => handleDownloadPDF(tailoredProfile)}
                                disabled={isDownloadingPdf}
                                className="btn-primary py-1 px-2.5 bg-rose-pine text-white text-[10px] font-extrabold flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Download PDF"
                              >
                                {isDownloadingPdf ? (
                                  <Loader2 className="animate-spin" size={11} />
                                ) : (
                                  <Download size={11} />
                                )}
                                Download PDF
                              </button>
                            )}
                            {tailorPreviewTab === "latex" && (
                              <>
                                <button 
                                  onClick={() => handleCopyLatex(tailoredProfile)}
                                  className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                                  title="Copy LaTeX (.tex)"
                                >
                                  <Copy size={11} />
                                </button>
                                <button 
                                  onClick={() => handleDownloadLatex(tailoredProfile)}
                                  className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                                  title="Download LaTeX (.tex)"
                                >
                                  <Download size={11} />
                                </button>
                              </>
                            )}
                            {tailorPreviewTab === "markdown" && (
                              <>
                                <button 
                                  onClick={() => handleCopyMarkdown(tailoredProfile)}
                                  className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                                  title="Copy Markdown"
                                >
                                  <Copy size={11} />
                                </button>
                                <button 
                                  onClick={() => handleDownloadMarkdown(tailoredProfile)}
                                  className="w-7 h-7 border-2 border-rose-border bg-rose-surface flex items-center justify-center hover:bg-rose-overlay text-rose-text font-bold"
                                  title="Download Markdown"
                                >
                                  <Download size={11} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Tailored Preview toggler */}
                        <div className="flex border-b-2 border-rose-border bg-rose-overlay/40 px-3 py-2 gap-2 -mx-5 mb-4 shrink-0">
                          {[
                            { id: "visual", label: "Visual Preview", icon: Eye },
                            { id: "latex", label: "LaTeX Code", icon: Code },
                            { id: "markdown", label: "Markdown", icon: FileText }
                          ].map((tab) => (
                            <button
                              key={tab.id}
                              onClick={() => setTailorPreviewTab(tab.id as any)}
                              className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all flex items-center gap-1.5 ${
                                tailorPreviewTab === tab.id
                                  ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                                  : "text-rose-muted border-transparent hover:text-rose-text"
                              }`}
                            >
                              <tab.icon size={12} />
                              {tab.label}
                            </button>
                          ))}
                        </div>

                        {/* Tailored Content View */}
                        <div>
                          {tailorPreviewTab === "visual" && (() => {
                            const isAcademic = latexTemplateStyle === "academic";
                            const isModern = latexTemplateStyle === "modern";
                            const isMinimalist = latexTemplateStyle === "minimalist";

                            return (
                              <div className={`bg-white border-2 border-rose-border px-6 pt-5 pb-2 text-black ${isAcademic ? "font-serif" : "font-sans"} text-[8.2pt] leading-snug max-w-[650px] mx-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none rounded-none`}>
                                <div className={`uppercase tracking-wide mb-0.5 ${isMinimalist ? "text-left font-bold text-[16pt]" : "text-center font-bold text-[15pt]"} ${isModern ? "text-blue-900" : "text-black"}`}>
                                  {tailoredProfile.name || contactName}
                                </div>
                                {(() => {
                                  const contactSpans = [];
                                  if (contactPhone) {
                                    contactSpans.push(
                                      <span key="phone" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                        <Phone size={8} className="stroke-[2.5]" />
                                        <a href={`tel:${contactPhone}`} className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{contactPhone}</a>
                                      </span>
                                    );
                                  }
                                  if (github) {
                                    contactSpans.push(
                                      <span key="github" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                        <Github size={8} className="stroke-[2.5]" />
                                        <a href={`https://github.com/${github.replace(/https?:\/\/(www\.)?github\.com\//, "")}`} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{github.replace(/https?:\/\/(www\.)?github\.com\//, "")}</a>
                                      </span>
                                    );
                                  }
                                  if (linkedin) {
                                    contactSpans.push(
                                      <span key="linkedin" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                        <Linkedin size={8} className="stroke-[2.5]" />
                                        <a href={`https://linkedin.com/in/${linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "")}`} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{linkedin.replace(/https?:\/\/(www\.)?linkedin\.com\/in\//, "")}</a>
                                      </span>
                                    );
                                  }
                                  if (contactEmail) {
                                    contactSpans.push(
                                      <span key="email" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                        <Mail size={8} className="stroke-[2.5]" />
                                        <a href={`mailto:${contactEmail}`} className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>{contactEmail}</a>
                                      </span>
                                    );
                                  }
                                  if (portfolio) {
                                    contactSpans.push(
                                      <span key="portfolio" className="inline-flex items-center gap-0.5 whitespace-nowrap">
                                        <Globe size={8} className="stroke-[2.5]" />
                                        <a href={portfolio} target="_blank" rel="noreferrer" className={`${isModern ? "text-blue-900" : "text-black"} hover:underline`}>Portfolio</a>
                                      </span>
                                    );
                                  }

                                  return (
                                    <div className={`text-[7.8pt] flex flex-row flex-nowrap whitespace-nowrap gap-x-1.5 pb-0.5 mb-1.5 items-center w-full overflow-hidden text-ellipsis justify-center ${isMinimalist ? "!justify-start text-left" : "justify-center text-center"} ${isModern ? "text-blue-900" : "text-black"}`}>
                                      {contactSpans.reduce((acc: any[], item: any, idx: number) => {
                                        if (idx > 0) {
                                          acc.push(<span key={`sep-${idx}`} className={`text-gray-400 select-none`}>&bull;</span>);
                                        }
                                        acc.push(item);
                                        return acc;
                                      }, [])}
                                    </div>
                                  );
                                })()}



                                {/* Skills */}
                                {renderSkillsVisual(tailoredProfile.skills)}

                                {/* Experience */}
                                {tailoredProfile.experience && tailoredProfile.experience.length > 0 && (
                                  <div className="mt-2">
                                    <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Experience</div>
                                    {tailoredProfile.experience.map((exp: any, idx: number) => (
                                      <div key={idx} className="mb-1.5 text-left pl-2">
                                        <div className="flex justify-between text-[8.4pt] text-black">
                                          <span>
                                            <span className="font-bold">{exp.role}</span>
                                            {exp.company && ` | ${exp.company}`}
                                          </span>
                                          <span className="font-normal italic text-[8.0pt] text-gray-700">{exp.duration}</span>
                                        </div>
                                        <ul className="list-disc pl-4 mt-0 text-[8.2pt] text-black">
                                          {exp.description.split("\n").map((b: string) => b.trim()).filter(Boolean).map((bullet: string, bIdx: number) => (
                                            <li key={bIdx} className="leading-snug text-justify">{bullet.replace(/^[-•▪◦*\d.]+\s*/, "")}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Education */}
                                {tailoredProfile.education && tailoredProfile.education.length > 0 && (
                                  <div className="mt-2">
                                    <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Education</div>
                                    {tailoredProfile.education.map((edu: any, idx: number) => (
                                      <div key={idx} className="mb-1 text-left pl-2">
                                        <div className="flex justify-between text-[8.4pt] text-black">
                                          <span className="font-bold">{edu.school}</span>
                                          <span className="font-normal italic text-[8.0pt] text-gray-700">{edu.duration}</span>
                                        </div>
                                        <div className="flex justify-between text-[8.0pt] text-gray-700">
                                          <span className="italic">{edu.degree}</span>
                                          {edu.gpa && <span className="font-medium text-black">{edu.gpa}</span>}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Projects */}
                                {tailoredProfile.projects && tailoredProfile.projects.length > 0 && (
                                  <div className="mt-2">
                                    <div className={`font-bold border-b ${isModern ? "border-blue-900 text-blue-900" : "border-black text-black"} text-[9.5pt] pb-0.5 mb-0.5 text-left uppercase tracking-wide`}>Projects</div>
                                    {tailoredProfile.projects.map((proj: any, idx: number) => (
                                      <div key={idx} className="mb-1.5 text-left pl-2">
                                        <div className="flex justify-between text-[8.4pt] text-black">
                                          <span>
                                            <span className="font-bold">{proj.name}</span>
                                            {proj.technologies && ` | ${proj.technologies}`}
                                          </span>
                                          <span className="font-normal italic text-[8.0pt] text-gray-700">{proj.link ? <a href={proj.link} target="_blank" rel="noreferrer" className="text-black underline">Link</a> : ""}</span>
                                        </div>
                                        <ul className="list-disc pl-4 mt-0 text-[8.2pt] text-black">
                                          {proj.description.split("\n").map((b: string) => b.trim()).filter(Boolean).map((bullet: string, bIdx: number) => (
                                            <li key={bIdx} className="leading-snug text-justify">{bullet.replace(/^[-•▪◦*\d.]+\s*/, "")}</li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}

                          {tailorPreviewTab === "latex" && (
                            <div className="space-y-2">
                              <textarea
                                readOnly
                                value={getLatexRepresentation(tailoredProfile, latexTemplateStyle)}
                                className="input w-full h-[300px] text-[10px] font-mono leading-relaxed bg-rose-surface border border-rose-hl-high outline-none p-2 resize-none"
                                onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                              />
                            </div>
                          )}

                          {tailorPreviewTab === "markdown" && (
                            <div className="space-y-3 text-xs leading-relaxed">
                              <div>
                                <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Tailored Bio</h5>
                                <p className="bg-rose-surface p-3 border border-rose-hl-high font-medium text-rose-subtle">{tailoredProfile.summary}</p>
                              </div>
                              {tailoredProfile.skills && (
                                <div>
                                  <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Tailored Skills</h5>
                                  <div className="flex flex-wrap gap-1 font-mono text-[9px] text-rose-text">
                                    {typeof tailoredProfile.skills === "object" && !Array.isArray(tailoredProfile.skills) ? (
                                      Object.entries(tailoredProfile.skills).map(([cat, tags]: any) => (
                                        <div key={cat} className="w-full bg-rose-surface p-1.5 border border-rose-hl-high mb-1">
                                          <strong>{cat}</strong>: {tags.join(", ")}
                                        </div>
                                      ))
                                    ) : Array.isArray(tailoredProfile.skills) ? (
                                      tailoredProfile.skills.map((s: string) => (
                                        <span key={s} className="px-1.5 py-0.5 font-bold text-[10px] bg-rose-surface border border-rose-border mr-1">{s}</span>
                                      ))
                                    ) : null}
                                  </div>
                                </div>
                              )}
                              {tailoredProfile.experience && (
                                <div>
                                  <h5 className="font-extrabold text-rose-text text-[11px] uppercase tracking-wider mb-1">Tailored Experience Details</h5>
                                  <div className="space-y-2">
                                    {tailoredProfile.experience.map((exp: any, idx: number) => (
                                      <div key={idx} className="bg-rose-surface p-2 border border-rose-hl-high font-medium">
                                        <p className="font-extrabold text-rose-text text-[11px]">{exp.role} @ {exp.company}</p>
                                        <p className="font-mono text-[10px] text-rose-muted mt-0.5 whitespace-pre-line leading-normal">{exp.description}</p>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Save Action */}
                        <button
                          onClick={handleSaveTailoredAsNew}
                          disabled={isCreating}
                          className="btn-primary w-full py-2.5 bg-rose-foam text-white"
                        >
                          {isCreating ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                          Save as New Resume
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              )}

            </div>

          </div>
        </div>
      ) : (
        // ─── SCENARIO 2: DEFAULT RESUME LIST & UPLOAD GRID VIEW ───
        <>
          {/* Header */}
          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">Resumes</h1>
              <p className="text-rose-subtle mt-1 text-sm font-medium">{resumes.length} resume profiles available</p>
            </div>
            <button
              onClick={() => {
                setNewResumeName("");
                setSelectedFile(null);
                setIsManualCreate(false);
                setShowUploadModal(true);
              }}
              className="btn-primary flex items-center gap-2 bg-rose-pine text-white py-2 px-4 text-xs font-black uppercase tracking-wider self-start sm:self-auto"
            >
              <Plus size={16} />
              Add Resume Profile
            </button>
          </motion.div>

          {/* Grid Content */}
          {isLoading ? (
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-44 card bg-rose-surface"
                />
              ))}
            </motion.div>
          ) : resumes.length === 0 ? (
            <motion.div
              variants={itemVariants}
              className="card bg-rose-surface py-16 text-center border-2 border-rose-border"
            >
              <div className="w-16 h-16 mx-auto flex items-center justify-center mb-4 bg-rose-gold/15 border-2 border-rose-border text-rose-text">
                <FileText size={28} className="stroke-[2.5]" />
              </div>
              <p className="text-rose-text font-black text-xl mb-2 uppercase tracking-tight">No Resume Profiles Configured</p>
              <p className="text-rose-muted text-sm max-w-md mx-auto mb-6">
                Upload your resume PDF to let the AI automatically parse your experience, or create a blank profile to configure your details manually.
              </p>
              <button
                onClick={() => {
                  setNewResumeName("Default Resume");
                  setSelectedFile(null);
                  setIsManualCreate(false);
                  setShowUploadModal(true);
                }}
                className="btn-primary mx-auto bg-rose-pine text-white flex items-center gap-2 px-6 py-3 font-extrabold uppercase tracking-wider text-xs"
              >
                <Plus size={16} />
                Set Up Default Resume
              </button>
            </motion.div>
          ) : (
            <motion.div
              variants={containerVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <AnimatePresence mode="popLayout">
                {resumes.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setSelectedResumeId(r.id)}
                    className="card bg-rose-surface p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer hover:-translate-y-0.5"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-rose-text text-base truncate hover:text-rose-pine transition-colors">{r.name}</h3>
                          <p className="text-[10px] text-rose-muted mt-0.5 font-semibold flex items-center gap-1">
                            <Calendar size={11} /> {formatDate(r.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {r.is_default && (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 bg-rose-overlay border-2 border-rose-border uppercase tracking-wider">
                              Default
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id, r.name);
                            }}
                            disabled={isDeleting}
                            className="w-8 h-8 flex items-center justify-center text-rose-muted border-2 border-rose-border bg-rose-surface hover:text-rose-love hover:border-rose-love hover:bg-rose-love/5 transition-all shrink-0"
                            title="Delete Resume"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      {r.file ? (
                        <a
                          href={r.file}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-rose-text hover:text-rose-pine bg-rose-overlay border-2 border-rose-border transition-all mt-2.5 group/link max-w-full shadow-[2px_2px_0px_0px_var(--color-hl-high)] hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText size={13} className="text-rose-iris group-hover/link:text-rose-pine shrink-0" />
                          <span className="truncate font-mono font-medium">{r.file.split("/").pop()}</span>
                        </a>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-rose-text bg-rose-overlay border-2 border-rose-border mt-2.5 select-none shadow-[2px_2px_0px_0px_var(--color-hl-high)]">
                          <Sparkles size={13} className="text-rose-gold shrink-0" />
                          <span className="truncate font-mono font-medium">Text-only Profile</span>
                        </div>
                      )}

                      {r.structured_data?.summary && (
                        <div className="mt-4 p-3 bg-rose-overlay/20 border-2 border-rose-border text-xs text-rose-muted leading-relaxed italic line-clamp-3 relative overflow-hidden select-none">
                          <div className="absolute top-0 bottom-0 left-0 w-[3px] bg-rose-gold" />
                          <span className="pl-1.5 block">{r.structured_data.summary}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </>
      )}

          {/* ─── UPLOAD / CREATE RESUME MODAL ─── */}
          <ResumeUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            newResumeName={newResumeName}
            setNewResumeName={setNewResumeName}
            selectedFile={selectedFile}
            setSelectedFile={setSelectedFile}
            isManualCreate={isManualCreate}
            setIsManualCreate={setIsManualCreate}
            isCreating={isCreating}
            isUploadingFile={isUploadingFile}
            onSubmit={handleCreateOrUploadResume}
          />
          {confirmModal}
          {promptModal}
        </motion.div>
      );
    }
