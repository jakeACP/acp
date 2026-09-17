import { useState } from "react";
import { AlertCircle, ExternalLink, User } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import type { MnBallotOffice, MnBallotResponse, MnCampaign, MnIncumbent } from "@shared/civic-map";

type MnBallotCampaignsProps = {
  data: MnBallotResponse | undefined;
  selectedOfficeId: string | null;
  /** True only when the address was matched to a precinct, so these offices really are the visitor's. */
  personalized: boolean;
  isLoading: boolean;
  error: boolean;
  onRetry: () => void;
  onShowBallot: () => void;
};

function Portrait({ src, name, compact = false }: { src: string | null; name: string; compact?: boolean }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`flex w-full items-center justify-center overflow-hidden bg-muted ${compact ? "h-32" : "h-40 sm:h-44"}`}>
      {src && !failed ? (
        <img
          src={src}
          alt={`${name} portrait`}
          loading="lazy"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover object-top"
        />
      ) : (
        <User aria-hidden="true" className="h-14 w-14 text-muted-foreground" />
      )}
    </div>
  );
}

function CampaignCard({ campaign }: { campaign: MnCampaign }) {
  return (
    <article
      className="mn-ballot-person-card overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm"
      style={{ transform: "none" }}
    >
      <Portrait src={campaign.photoUrl} name={campaign.fullName} />
      <div className="space-y-1.5 p-3">
        <h4 className="font-semibold leading-tight">{campaign.fullName}</h4>
        <p className="text-sm text-muted-foreground">{campaign.party || "Party not listed"}</p>
        <p className="text-xs">{campaign.officeTitle}</p>
        {campaign.electionYear === null && (
          <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
            Declared campaign · election year not confirmed
          </p>
        )}
        {campaign.filingStatus && (
          <p className="text-xs capitalize text-muted-foreground">Status: {campaign.filingStatus.replaceAll("_", " ")}</p>
        )}
        {campaign.profileId && (
          <Link href={`/politicians/${campaign.profileId}`} className="inline-block text-xs font-medium text-primary hover:underline">
            View campaign profile
          </Link>
        )}
        {campaign.sourceUrl && /^https?:\/\//i.test(campaign.sourceUrl) && (
          <a href={campaign.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
            Source record <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </article>
  );
}

function OfficeholderCard({ incumbent }: { incumbent: MnIncumbent }) {
  return (
    <article
      className="mn-ballot-person-card overflow-hidden rounded-lg border bg-card text-card-foreground"
      style={{ transform: "none" }}
    >
      <Portrait src={incumbent.photoUrl} name={incumbent.fullName} compact />
      <div className="p-3">
        <h4 className="font-semibold leading-tight">{incumbent.fullName}</h4>
        <p className="mt-1 text-xs text-muted-foreground">{incumbent.party || "Party not listed"}</p>
      </div>
    </article>
  );
}

function OfficeGroup({ office }: { office: MnBallotOffice }) {
  const campaignProfiles = new Set(office.campaigns.map(campaign => campaign.profileId).filter(Boolean));
  const separateIncumbents = office.incumbents.filter(incumbent => !campaignProfiles.has(incumbent.id));
  const empty = office.campaigns.length === 0 && separateIncumbents.length === 0;

  return (
    <section aria-labelledby={`ballot-office-${office.id}`} className="space-y-4 border-t pt-6 first:border-t-0 first:pt-0">
      <div>
        <h3 id={`ballot-office-${office.id}`} className="text-lg font-semibold">
          {office.district?.label || office.label}
        </h3>
        {office.district && office.district.label !== office.label && (
          <p className="text-sm text-muted-foreground">{office.label}</p>
        )}
        {office.electionStatus === "unconfirmed" && (
          <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">Election in this cycle not confirmed</p>
        )}
      </div>

      {office.campaigns.length > 0 && (
        <div>
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Campaigns</h4>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {office.campaigns.map(campaign => <CampaignCard key={campaign.id} campaign={campaign} />)}
          </div>
        </div>
      )}

      {separateIncumbents.length > 0 && (
        <div className="rounded-xl border bg-card p-4 text-card-foreground">
          <h4 className="font-semibold">Current officeholders</h4>
          <p className="mb-3 text-xs text-muted-foreground">
            Current service does not confirm candidacy in this election.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {separateIncumbents.map(incumbent => <OfficeholderCard key={incumbent.id} incumbent={incumbent} />)}
          </div>
        </div>
      )}

      {empty && (
        <p className="rounded-lg border bg-card p-5 text-sm text-card-foreground">
          No campaigns or current officeholders are listed for this office.
        </p>
      )}
    </section>
  );
}

export function MnBallotCampaigns({
  data,
  selectedOfficeId,
  personalized,
  isLoading,
  error,
  onRetry,
  onShowBallot,
}: MnBallotCampaignsProps) {
  const selectedOffice = selectedOfficeId ? data?.offices.find(office => office.id === selectedOfficeId) : null;
  const offices = selectedOfficeId ? (selectedOffice ? [selectedOffice] : []) : data?.offices ?? [];
  const heading = selectedOfficeId
    ? `Campaigns for ${selectedOffice?.district?.label || selectedOffice?.label || "selected office"}`
    : personalized
      ? "Your Ballot"
      : "Minnesota offices";

  return (
    <section className="mn-ballot-campaigns mb-10 text-foreground" aria-labelledby="mn-ballot-campaigns-heading">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="mn-ballot-campaigns-heading" className="text-2xl font-bold">{heading}</h2>
          {!personalized && (
            <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
              Your address was not matched to a precinct, so no district offices are listed here.
            </p>
          )}
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            {data ? `${data.cycleLabel} · ${data.coverageNote}` : "Campaign and officeholder coverage for Minnesota districts."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShowBallot}>{personalized ? "Show full ballot" : "Show all offices"}</Button>
          <Button asChild variant="outline">
            <a href="https://myballotmn.sos.mn.gov/" target="_blank" rel="noreferrer">
              Official sample ballot <ExternalLink className="ml-1 h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>

      <div aria-live="polite" aria-busy={isLoading}>
        {isLoading ? (
          <div aria-label="Loading ballot campaigns" className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3].map(item => (
              <div key={item} className="overflow-hidden rounded-xl border bg-card">
                <div className="h-40 animate-pulse bg-muted" />
                <div className="space-y-2 p-3"><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-card p-4 text-card-foreground">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Campaign and officeholder information could not be loaded.</span>
            <Button size="sm" variant="outline" onClick={onRetry}>Try again</Button>
          </div>
        ) : offices.length > 0 ? (
          <div className="space-y-8">{offices.map(office => <OfficeGroup key={office.id} office={office} />)}</div>
        ) : (
          <p className="rounded-lg border bg-card p-5 text-sm text-card-foreground">
            {selectedOfficeId
              ? "No information is available for the selected office."
              : personalized
                ? "No ballot offices are listed for this address and cycle."
                : "No offices are listed for this cycle."}
          </p>
        )}
      </div>
    </section>
  );
}