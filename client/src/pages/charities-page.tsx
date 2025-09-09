import { useState } from "react";
import { Navigation } from "@/components/navigation";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CharityCard } from "@/components/charity-card";
import { CharityCreationForm } from "@/components/charity-creation-form";
import { Plus, Search, Filter, Heart, Loader2 } from "lucide-react";
import type { Charity } from "@shared/schema";

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "environment", label: "Environment" },
  { value: "education", label: "Education" },
  { value: "healthcare", label: "Healthcare" },
  { value: "poverty", label: "Poverty Relief" },
  { value: "disaster", label: "Disaster Relief" },
  { value: "community", label: "Community" },
  { value: "global", label: "Global Causes" },
];

export default function CharitiesPage() {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [showActiveOnly, setShowActiveOnly] = useState(true);

  const { data: charities, isLoading, error } = useQuery({
    queryKey: ["/api/charities", { category: selectedCategory, isActive: showActiveOnly }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== "all") params.append("category", selectedCategory);
      if (showActiveOnly !== undefined) params.append("isActive", showActiveOnly.toString());
      
      const response = await fetch(`/api/charities?${params}`);
      if (!response.ok) throw new Error("Failed to fetch charities");
      return response.json() as Promise<Charity[]>;
    },
  });

  const filteredCharities = charities?.filter(charity => 
    charity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    charity.description.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleCreateSuccess = () => {
    setShowCreateForm(false);
  };

  if (showCreateForm) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="container max-w-4xl mx-auto py-6">
          <CharityCreationForm
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      <div className="container max-w-7xl mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="charities-page-title">
            <Heart className="h-8 w-8 text-red-500" />
            Charities
          </h1>
          <p className="text-muted-foreground mt-1">
            Support causes you care about with donations in USD or ACP coins
          </p>
        </div>
        
        <Button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2"
          data-testid="button-create-charity"
        >
          <Plus className="h-4 w-4" />
          Create Charity
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search charities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-charities"
                />
              </div>
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-48" data-testid="select-charity-category-filter">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <Button
                variant={showActiveOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowActiveOnly(!showActiveOnly)}
                data-testid="button-filter-active"
              >
                Active Only
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Error loading charities. Please try again later.
            </p>
          </CardContent>
        </Card>
      ) : filteredCharities.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || (selectedCategory && selectedCategory !== "all")
                ? "No charities match your search criteria."
                : "No charities available. Be the first to create one!"}
            </p>
            {!searchQuery && (!selectedCategory || selectedCategory === "all") && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="mt-4"
                data-testid="button-create-first-charity"
              >
                Create Charity
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stats */}
          <div className="flex flex-wrap gap-4">
            <Badge variant="outline" className="text-sm py-1">
              {filteredCharities.length} {filteredCharities.length === 1 ? "charity" : "charities"}
            </Badge>
            <Badge variant="outline" className="text-sm py-1">
              {filteredCharities.reduce((sum, charity) => sum + charity.donorCount, 0)} total donors
            </Badge>
            <Badge variant="outline" className="text-sm py-1">
              ${filteredCharities.reduce((sum, charity) => sum + parseFloat(charity.raisedAmount), 0).toLocaleString()} raised
            </Badge>
          </div>

          {/* Charity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharities.map((charity) => (
              <CharityCard key={charity.id} charity={charity} />
            ))}
          </div>
        </>
      )}
      </div>
    </div>
  );
}