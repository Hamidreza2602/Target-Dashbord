import { MetricDefinition } from '../types';

export const FORMULA_VERSION_ID = 'fv-1';

export const metricDefinitions: MetricDefinition[] = [
  // ==================== Growth & Adoption ====================
  { key: 'visits', name: 'Visits', category: 'growth_adoption', unit: 'count', isInput: true, directionality: 'higher_better', description: 'Total visitor sessions to the app listing page.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'installs', name: 'Installations Count', category: 'growth_adoption', unit: 'count', isInput: true, directionality: 'higher_better', description: 'Number of new app installations in the period.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'visitor_to_free_conversion', name: 'Visitor to Free User Conversion Rate', category: 'growth_adoption', unit: 'percent', isInput: false, directionality: 'higher_better', description: 'Installs / Visits. Derived from visits and installs.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'user_to_trial_conversion', name: 'User to Trial Conversion Rate', category: 'growth_adoption', unit: 'percent', isInput: true, directionality: 'higher_better', description: 'Percentage of free users who start a trial.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Conversion ====================
  { key: 'trial_conversion_rate', name: 'Trial Conversion Rate', category: 'conversion', unit: 'percent', isInput: true, directionality: 'higher_better', description: 'Percentage of trial users who become paying customers.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'user_conversion_rate', name: 'User Conversion Rate', category: 'conversion', unit: 'percent', isInput: false, directionality: 'higher_better', description: 'Derived: (Trial Starts * Trial Conversion Rate) / Free Users.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'visitor_conversion_rate', name: 'Visitor Conversion Rate', category: 'conversion', unit: 'percent', isInput: false, directionality: 'higher_better', description: 'Derived: Customers gained / Visits.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Retention & Churn ====================
  { key: 'free_user_churn_rate', name: 'Free User Churn Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of free users who uninstall per period.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'trial_churn_rate', name: 'Trial Churn Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of trial users who abandon trial.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'customer_churn_rate', name: 'Customer Churn Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of paying customers who cancel.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'back_to_free_rate', name: 'Back to Free Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of customers who downgrade to free (not uninstall).', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'deactivation_rate', name: 'Deactivation Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of customers who are deactivated/frozen.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'reactivation_rate', name: 'Reactivation Rate', category: 'retention_churn', unit: 'percent', isInput: true, directionality: 'higher_better', description: 'Percentage of churned free users who reactivate to paying.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Expansion / Contraction ====================
  { key: 'upgrade_rate', name: 'Upgrade Rate', category: 'expansion_contraction', unit: 'percent', isInput: true, directionality: 'higher_better', description: 'Percentage of customers who upgrade to a higher plan.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'downgrade_rate', name: 'Downgrade Rate', category: 'expansion_contraction', unit: 'percent', isInput: true, directionality: 'lower_better', description: 'Percentage of customers who downgrade to a lower plan.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Revenue ====================
  { key: 'mrr', name: 'MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Monthly Recurring Revenue = StartingMRR + New + Restart + Expansion - Churn - Contraction.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'arr', name: 'ARR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Annual Recurring Revenue = MRR * 12.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'new_mrr', name: 'New MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Revenue from new subscriptions (not restarts).', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'restart_mrr', name: 'Restart MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Revenue from reactivations / restarts.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'expansion_mrr', name: 'Expansion MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Revenue from upgrades.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'contraction_mrr', name: 'Contraction MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'lower_better', description: 'Revenue lost from downgrades.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'churn_mrr', name: 'Churn MRR', category: 'revenue', unit: 'currency', isInput: false, directionality: 'lower_better', description: 'Revenue lost from cancellations and deactivations.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Monetization ====================
  { key: 'arpu', name: 'ARPU', category: 'monetization', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Average Revenue Per User = MRR / Customers.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'arpu_recurring', name: 'ARPU Recurring', category: 'monetization', unit: 'currency', isInput: true, directionality: 'higher_better', description: 'Average recurring revenue per customer.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'arpu_non_recurring', name: 'ARPU Non-recurring', category: 'monetization', unit: 'currency', isInput: true, directionality: 'higher_better', description: 'Average non-recurring revenue per customer.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'arpu_transaction_fee', name: 'ARPU Transaction Fee', category: 'monetization', unit: 'currency', isInput: true, directionality: 'higher_better', description: 'Average transaction fee revenue per customer.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'clv', name: 'CLV', category: 'monetization', unit: 'currency', isInput: false, directionality: 'higher_better', description: 'Customer Lifetime Value = ARPU(Yearly) / Customer Churn Rate(Yearly).', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'grr', name: 'GRR', category: 'monetization', unit: 'percent', isInput: false, directionality: 'higher_better', description: 'Gross Revenue Retention = (StartingARR - Contraction - Churn) / StartingARR.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'nrr', name: 'NRR', category: 'monetization', unit: 'percent', isInput: false, directionality: 'higher_better', description: 'Net Revenue Retention = (StartingARR + Expansion - Contraction - Churn) / StartingARR.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Cost ====================
  { key: 'spend', name: 'Marketing Spend', category: 'cost', unit: 'currency', isInput: true, directionality: 'lower_better', description: 'Total marketing spend in the period.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'cpl', name: 'CPL', category: 'cost', unit: 'currency', isInput: false, directionality: 'lower_better', description: 'Cost Per Lead = Spend / Visits.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'cpa', name: 'CPA', category: 'cost', unit: 'currency', isInput: false, directionality: 'lower_better', description: 'Cost Per Acquisition = Spend / Installs.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'cac', name: 'CAC', category: 'cost', unit: 'currency', isInput: false, directionality: 'lower_better', description: 'Customer Acquisition Cost = Spend / New Customers.', formulaVersionId: FORMULA_VERSION_ID },

  // ==================== Count / State ====================
  { key: 'free_users', name: 'Free Users Count', category: 'count', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Total installed users not on a paid plan.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'active_trials', name: 'Active Trials', category: 'count', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Users currently in an active trial.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'customers', name: 'Customer Count', category: 'count', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Total paying customers.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'uninstalls', name: 'Uninstallations Count', category: 'count', unit: 'count', isInput: false, directionality: 'lower_better', description: 'Number of app uninstalls in the period.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'deactivations', name: 'Deactivation Count', category: 'count', unit: 'count', isInput: false, directionality: 'lower_better', description: 'Number of customer deactivations.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'reactivation_count', name: 'Reactivation Count', category: 'count', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Number of reactivations from free to paid.', formulaVersionId: FORMULA_VERSION_ID },
];

// ==================== OKR Standalone Metrics ====================
// These are NOT simulator inputs — they are tracked via the Targets/OKR system only.

export const okrMetricDefinitions: MetricDefinition[] = [
  // --- Organic Installs ---
  { key: 'okr_installs_organic_new_channels', name: '# Install from New Organic Channels', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from newly opened organic channels.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_social_listening', name: '# Install by Social Listening', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs attributed to social listening efforts.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_agencies', name: '# Install by Agencies', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from agency referrals.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_sales', name: '# Install by Sales', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from direct sales team efforts.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_app_score', name: 'App Score', category: 'okr', unit: 'ratio', isInput: false, directionality: 'higher_better', description: 'App store rating or review score.', formulaVersionId: FORMULA_VERSION_ID },

  // --- Non-organic Installs ---
  { key: 'okr_installs_inorganic_total', name: '# Install from Inorganic Channels (Total)', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Total installs from all paid/inorganic channels.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_shopify', name: '# Install from Shopify', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from Shopify App Store ads.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_google', name: '# Install from Google', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from Google Ads.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_affiliate', name: '# Install from Affiliate', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from affiliate program.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_linkedin', name: '# Install from LinkedIn', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from LinkedIn campaigns.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_youtube', name: '# Install from YouTube', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from YouTube campaigns.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_facebook', name: '# Install from Facebook', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from Facebook campaigns.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_instagram', name: '# Install from Instagram', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from Instagram campaigns.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_installs_tiktok', name: '# Install from TikTok', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Installs from TikTok campaigns.', formulaVersionId: FORMULA_VERSION_ID },

  // --- Brand Recognition ---
  { key: 'okr_active_agencies', name: '# Active Agencies', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Number of actively engaged partner agencies.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_integrations', name: '# Integrations', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Number of live integrations with other platforms.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_posts_published', name: '# Posts Published', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Blog, LinkedIn, Instagram posts published.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_case_studies', name: '# Case Studies', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Published customer case studies.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_guest_posts', name: '# Guest Posts Published', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Guest posts published on external sites.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_contents_shared_team', name: '# Contents Shared by Team', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Content pieces shared by team members.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_search_in_llms', name: 'Search in LLMs', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Brand visibility in LLM search results.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_events_participated', name: '# Events Participated', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Industry events participated in.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_events_held', name: '# Events Held', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Events organized/hosted by the company.', formulaVersionId: FORMULA_VERSION_ID },
  { key: 'okr_awareness_metric', name: 'Awareness Metric', category: 'okr', unit: 'count', isInput: false, directionality: 'higher_better', description: 'Composite brand awareness score.', formulaVersionId: FORMULA_VERSION_ID },
];

// All metrics combined
export const allMetricDefinitions = [...metricDefinitions, ...okrMetricDefinitions];

// Mapping from OKR metric keys to simulator driver keys (Objective 1 only)
export const SIMULATOR_DRIVER_MAPPING: Record<string, string> = {
  'free_churn_rate_new': 'free_churn_rate_new',
  'paid_churn_rate_new': 'paid_churn_rate_new',
  'paid_churn_rate_old': 'paid_churn_rate_old',
  'user_conv_rate_new': 'user_conv_rate_new',
};

export const metricsByKey = Object.fromEntries(allMetricDefinitions.map(m => [m.key, m]));

export const metricsByCategory = allMetricDefinitions.reduce((acc, m) => {
  if (!acc[m.category]) acc[m.category] = [];
  acc[m.category].push(m);
  return acc;
}, {} as Record<string, MetricDefinition[]>);

export const categoryLabels: Record<string, string> = {
  growth_adoption: 'Growth & Adoption',
  conversion: 'Conversion Rates',
  retention_churn: 'Retention & Churn',
  expansion_contraction: 'Expansion / Contraction',
  revenue: 'Revenue',
  monetization: 'Monetization',
  cost: 'Acquisition Cost',
  count: 'Count / State',
  okr: 'OKR Metrics',
};

export const inputDrivers = metricDefinitions.filter(m => m.isInput);
export const derivedMetrics = metricDefinitions.filter(m => !m.isInput);
