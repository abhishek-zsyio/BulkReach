export type ScrapeJobStatus = "pending" | "running" | "done" | "failed";

export interface ScrapeJob {
  id: number;
  platform: string;
  platform_display: string;
  keywords: string;
  location: string;
  max_results: number;
  status: ScrapeJobStatus;
  status_display: string;
  result_count: number;
  error_message: string | null;
  celery_task_id: string | null;
  created_at: string;
  completed_at: string | null;
  duration?: number | null;
  use_ai_matching?: boolean;
  campaign_id?: number;
  freshness?: string;
  company_size?: string;
}
export interface ScrapedContact {
  id: number;
  name: string;
  email: string;
  company: string;
  job_title: string;
  linkedin_url: string;
  source_url: string;
  posted_date?: string;
  location?: string;
  salary?: string;
  created_at: string;
}

export interface ScrapeJobResults {
  job: ScrapeJob;
  contacts: ScrapedContact[];
  count: number;
}

export type CompanyEnrichmentStatus = "pending" | "running" | "done" | "failed";

export interface CompanyEmployee {
  id: number;
  name: string;
  job_title: string;
  linkedin_url: string;
  email: string;
  role_description?: string;
  profile_insights?: string;
  created_at: string;
}

export interface CompanyEnrichment {
  id: number;
  company_name: string;
  domain: string;
  logo_url: string;
  website: string;
  description: string;
  industry: string;
  location: string;
  status: CompanyEnrichmentStatus;
  status_display: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  duration?: number | null;
  employees: CompanyEmployee[];
}

