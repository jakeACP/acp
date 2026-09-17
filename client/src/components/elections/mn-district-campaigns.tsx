import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AlertCircle, ExternalLink, Loader2, User } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import type { MnCampaignResponse, MnDistrict } from "@shared/civic-map";

export function MnDistrictCampaigns({ district, year }: { district: MnDistrict | null; year: number }) {
  const query = useQuery<MnCampaignResponse>({
    queryKey: ["/api/elections/mn/campaigns", district?.id, year],
    queryFn: async () => {
      const params = new URLSearchParams({ districtId: district!.id, year: String(year) });
      return (await apiRequest(`/api/elections/mn/campaigns?${params}`, "GET")).json();
    },
    enabled: !!district,
  });

  return (
    <section aria-labelledby="district-campaigns-heading" className="mb-10" data-testid="district-campaigns">
      <h2 id="district-campaigns-heading" className="text-xl font-semibold">
        {district ? `Campaigns for ${district.label}` : "Select a district to see its campaigns"}
      </h2>
      <p className="mt-1 mb-4 text-sm text-muted-foreground">
        {year} elections · Only the selected office and district. Listings are ACP records, not a certified ballot.
      </p>
      <div aria-live="polite" aria-busy={query.isFetching}>
        {!district ? (
          <p className="rounded-lg border p-5 text-sm text-muted-foreground">Choose a district in the sidebar or click its area on the map.</p>
        ) : query.isPending ? (
          <p className="flex items-center gap-2 py-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading district campaigns…</p>
        ) : query.isError ? (
          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Could not load campaigns for this district.</span>
            <Button size="sm" variant="outline" onClick={() => query.refetch()}>Try again</Button>
          </div>
        ) : !query.data.campaigns.length ? (
          <p className="rounded-lg border p-5 text-muted-foreground">
            No campaigns listed in ACP for {district.label} in {year}. This does not mean there are no candidates running.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {query.data.campaigns.map(campaign => (
              <article key={campaign.id} className="overflow-hidden rounded-lg border bg-card text-card-foreground">
                <div className="flex items-center gap-3 p-4">
                  {campaign.photoUrl ? (
                    <img src={campaign.photoUrl} alt="" loading="lazy" className="h-16 w-16 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted"><User className="h-7 w-7 text-muted-foreground" /></div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-semibold">{campaign.fullName}</h3>
                    <p className="text-sm text-muted-foreground">{campaign.party || "Party not listed"}</p>
                  </div>
                </div>
                <div className="space-y-2 px-4 pb-4">
                  <p className="text-sm">{campaign.officeTitle}</p>
                  {campaign.electionYear === null && <p className="text-xs text-muted-foreground">Declared campaign · election year not confirmed</p>}
                  {campaign.filingStatus && <p className="text-xs capitalize text-muted-foreground">Status: {campaign.filingStatus.replaceAll("_", " ")}</p>}
                  {campaign.sourceName && <p className="text-xs text-muted-foreground">Source: {campaign.sourceName}</p>}
                  {campaign.profileId && (
                    <Button asChild variant="outline" size="sm"><Link href={`/politicians/${campaign.profileId}`}>View campaign profile</Link></Button>
                  )}
                  {campaign.sourceUrl && /^https?:\/\//i.test(campaign.sourceUrl) && (
                    <a href={campaign.sourceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Source record <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}