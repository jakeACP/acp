import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, CheckCircle2, XCircle, Eye, BadgeCheck, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";

export default function AdminVoterVerificationPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewDecision, setReviewDecision] = useState<"verified" | "rejected" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // Redirect non-admins (using useEffect to avoid render loop)
  useEffect(() => {
    if (user && user.role !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["/api/admin/voter-verification/requests", statusFilter],
    queryFn: async () => {
      const response = await fetch(
        `/api/admin/voter-verification/requests${statusFilter ? `?status=${statusFilter}` : ""}`
      );
      return response.json();
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async ({ requestId, decision, rejectionReason }: any) => {
      return apiRequest(`/api/admin/voter-verification/${requestId}/review`, "PATCH", {
        decision,
        rejectionReason,
      });
    },
    onSuccess: () => {
      toast({
        title: "Review Submitted",
        description: `Request has been ${reviewDecision === "verified" ? "approved" : "rejected"}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/voter-verification/requests"] });
      setShowReviewDialog(false);
      setSelectedRequest(null);
      setReviewDecision(null);
      setRejectionReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review.",
        variant: "destructive",
      });
    },
  });

  const handleReview = (request: any, decision: "verified" | "rejected") => {
    setSelectedRequest(request);
    setReviewDecision(decision);
    setShowReviewDialog(true);
  };

  const handleSubmitReview = () => {
    if (!selectedRequest || !reviewDecision) return;
    if (reviewDecision === "rejected" && !rejectionReason.trim()) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason.",
        variant: "destructive",
      });
      return;
    }

    reviewMutation.mutate({
      requestId: selectedRequest.id,
      decision: reviewDecision,
      rejectionReason: reviewDecision === "rejected" ? rejectionReason : undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-500">Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin/dashboard")}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Admin Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
            <BadgeCheck className="h-8 w-8" />
            Voter Verification Requests
          </h1>
          <p className="text-slate-600 mt-2">Review and approve voter verification submissions</p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2">
          <Button
            variant={statusFilter === "pending" ? "default" : "outline"}
            onClick={() => setStatusFilter("pending")}
            data-testid="filter-pending"
          >
            Pending
          </Button>
          <Button
            variant={statusFilter === "verified" ? "default" : "outline"}
            onClick={() => setStatusFilter("verified")}
            data-testid="filter-verified"
          >
            Verified
          </Button>
          <Button
            variant={statusFilter === "rejected" ? "default" : "outline"}
            onClick={() => setStatusFilter("rejected")}
            data-testid="filter-rejected"
          >
            Rejected
          </Button>
          <Button
            variant={statusFilter === "" ? "default" : "outline"}
            onClick={() => setStatusFilter("")}
            data-testid="filter-all"
          >
            All
          </Button>
        </div>

        {/* Requests List */}
        <Card>
          <CardHeader>
            <CardTitle>Verification Requests</CardTitle>
            <CardDescription>
              {statusFilter ? `Showing ${statusFilter} requests` : "Showing all requests"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading requests...</div>
            ) : !requests || requests.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No verification requests found.
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map((request: any) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">{request.fullLegalName}</h3>
                          {getStatusBadge(request.status)}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                          <div>
                            <span className="font-medium">Email:</span> {request.emailAddress}
                          </div>
                          <div>
                            <span className="font-medium">Phone:</span> {request.phoneNumber}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span>{" "}
                            {request.submittedAt ? format(new Date(request.submittedAt), "MMM d, yyyy") : "N/A"}
                          </div>
                          {request.reviewedAt && (
                            <div>
                              <span className="font-medium">Reviewed:</span>{" "}
                              {format(new Date(request.reviewedAt), "MMM d, yyyy")}
                            </div>
                          )}
                        </div>

                        {request.hasFelonyOrIneligibility && (
                          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                              <div>
                                <p className="font-medium text-yellow-900">Felony/Ineligibility Noted</p>
                                {request.ineligibilityExplanation && (
                                  <p className="text-sm text-yellow-700 mt-1">
                                    {request.ineligibilityExplanation}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {request.status === "rejected" && request.rejectionReason && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded">
                            <p className="font-medium text-red-900">Rejection Reason:</p>
                            <p className="text-sm text-red-700 mt-1">{request.rejectionReason}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 ml-4">
                        <Dialog>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedRequest(request)}
                            data-testid={`button-view-${request.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Verification Request Details</DialogTitle>
                            </DialogHeader>
                            {selectedRequest && selectedRequest.id === request.id && (
                              <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">Full Name</p>
                                    <p className="text-slate-900">{selectedRequest.fullLegalName}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">Date of Birth</p>
                                    <p className="text-slate-900">
                                      {selectedRequest.dateOfBirth
                                        ? format(new Date(selectedRequest.dateOfBirth), "MMM d, yyyy")
                                        : "N/A"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-slate-700">Address</p>
                                    <p className="text-slate-900">{selectedRequest.address}</p>
                                  </div>
                                </div>

                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-slate-700">State ID Photo</p>
                                  <img
                                    src={selectedRequest.stateIdPhotoUrl}
                                    alt="State ID"
                                    className="max-w-full h-auto border rounded"
                                  />
                                </div>

                                <div className="space-y-2">
                                  <p className="text-sm font-medium text-slate-700">Selfie with ID</p>
                                  <img
                                    src={selectedRequest.selfiePhotoUrl}
                                    alt="Selfie"
                                    className="max-w-full h-auto border rounded"
                                  />
                                </div>
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>

                        {request.status === "pending" && (
                          <>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleReview(request, "verified")}
                              className="bg-green-600 hover:bg-green-700"
                              data-testid={`button-approve-${request.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Approve
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleReview(request, "rejected")}
                              data-testid={`button-reject-${request.id}`}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Review Confirmation Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewDecision === "verified" ? "Approve" : "Reject"} Verification Request
            </DialogTitle>
            <DialogDescription>
              {reviewDecision === "verified"
                ? "This user will receive a verified voter badge on their profile."
                : "Please provide a reason for rejection."}
            </DialogDescription>
          </DialogHeader>

          {reviewDecision === "rejected" && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Rejection Reason *</label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Explain why this verification was rejected..."
                className="min-h-[100px]"
                data-testid="textarea-rejection-reason"
              />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitReview}
              disabled={reviewMutation.isPending}
              className={
                reviewDecision === "verified" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
              }
              data-testid="button-confirm-review"
            >
              {reviewMutation.isPending ? "Submitting..." : `Confirm ${reviewDecision === "verified" ? "Approval" : "Rejection"}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
