import { QuoteLink } from "@/components/QuoteLink";
import { dictionary } from "@/lib/content";
import type { Locale } from "@/lib/i18n";
import type { getMarketingPageContent, SiteChromeContent } from "@/lib/supabase/site-content";
import { WorkshopLocation } from "./WorkshopLocation";

export function ContactSection({
  locale,
  site,
  content,
  heading: Heading = "h2",
}: {
  locale: Locale;
  site: SiteChromeContent;
  content: Awaited<ReturnType<typeof getMarketingPageContent>>;
  heading?: "h1" | "h2";
}) {
  return (
    <>
      <section className="section-shell contact-page" aria-labelledby="contact-section-title">
        <div>
          <p className="eyebrow">{content.eyebrow}</p>
          <Heading id="contact-section-title">{content.title}</Heading>
          <p>{content.description}</p>
          <QuoteLink className="button button--gold">
            {dictionary[locale].common.requestQuote}
          </QuoteLink>
        </div>
        <address className="contact-card">
          <a href={site.phoneHref}>{site.phone}</a>
          <a href={site.emailHref}>{site.email}</a>
          <a href={site.instagram} target="_blank" rel="noreferrer">
            {site.instagramHandle}
          </a>
          <span>{site.location}</span>
        </address>
      </section>
      <WorkshopLocation locale={locale} map={site.workshop} />
    </>
  );
}
