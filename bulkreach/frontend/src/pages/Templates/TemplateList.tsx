import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, FileText, Trash2, Edit, Code, Eye } from "lucide-react";
import { useGetTemplatesQuery, useDeleteTemplateMutation } from "@/api/campaignApi";
import { formatDate } from "@/utils/helpers";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { EmailTemplate } from "@/types/campaign";
import { useConfirm } from "@/components/ui/dialogs";
import { PreviewModal } from "@/components/scraper/PreviewModal";

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



export function TemplateList() {
  const navigate = useNavigate();
  const { data: templates = [], isLoading } = useGetTemplatesQuery();
  const [deleteTemplate] = useDeleteTemplateMutation();
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const { confirm, modal } = useConfirm();

  const handleDelete = async (id: number, name: string) => {
    const ok = await confirm({
      title: "Delete Template",
      message: `Delete template "${name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteTemplate(id).unwrap();
      toast.success("Template deleted.");
    } catch {
      toast.error("Failed to delete template.");
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8 animate-fade-in pb-12"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">Email Templates</h1>
          <p className="text-rose-subtle mt-1 text-sm font-medium">{templates.length} templates available</p>
        </div>
        <button id="create-template-btn" onClick={() => navigate("/templates/new/edit")} className="btn-primary">
          <Plus size={15} /> New Template
        </button>
      </motion.div>

      {/* Grid Content */}
      {isLoading ? (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-none h-40 bg-rose-surface border-2 border-rose-border"
            />
          ))}
        </motion.div>
      ) : templates.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="card py-20 text-center bg-rose-surface"
        >
          <div className="w-16 h-16 rounded-none mx-auto flex items-center justify-center mb-4 bg-rose-overlay border-2 border-rose-border text-rose-text">
            <FileText size={24} />
          </div>
          <p className="text-rose-text font-bold text-lg mb-1">No templates yet</p>
          <p className="text-rose-muted text-sm mb-6 max-w-xs mx-auto">Create your first email template to get started.</p>
          <button onClick={() => navigate("/templates/new/edit")} className="btn-primary mx-auto">
            <Plus size={15} /> Create Template
          </button>
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {templates.map((t) => (
              <div
                key={t.id}
                className="card card-interactive flex flex-col justify-between p-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-extrabold text-rose-text text-base truncate group-hover:text-rose-pine transition-colors">{t.name}</h3>
                      <p className="text-[10px] text-rose-muted mt-0.5 font-extrabold">{formatDate(t.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                       {t.is_default && (
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-none bg-rose-iris/10 text-rose-iris border border-rose-iris/30 uppercase tracking-wider">
                          Default
                        </span>
                      )}
                      <button
                        id={`delete-template-${t.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(t.id, t.name);
                        }}
                        className="w-7 h-7 rounded-none flex items-center justify-center text-rose-muted border border-transparent hover:text-rose-love hover:border-rose-love transition-colors"
                        title="Delete Template"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Variable chips */}
                  {t.available_variables.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-5 items-center">
                      <Code size={11} className="text-rose-muted flex-shrink-0" />
                      {t.available_variables.map((v) => (
                        <span
                          key={v}
                          className="text-[10px] px-2 py-0.5 rounded-none bg-rose-rose/10 border border-rose-rose/30 text-rose-rose font-mono font-bold"
                        >
                          {`{{${v}}}`}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-auto pt-3 border-t border-rose-hl-med">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTemplate(t);
                    }}
                    className="btn-secondary text-xs py-1.5 justify-center font-bold"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  <button
                    id={`edit-template-${t.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/templates/${t.id}/edit`);
                    }}
                    className="btn-secondary text-xs py-1.5 justify-center font-bold"
                  >
                    <Edit size={12} /> Edit
                  </button>
                </div>
              </div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Preview Modal ── */}
      <AnimatePresence>
        {previewTemplate && (
          <PreviewModal
            templateId={previewTemplate.id}
            templateName={previewTemplate.name}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>
      {modal}
    </motion.div>
  );
}

