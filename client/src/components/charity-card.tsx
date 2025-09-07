import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, Globe, GraduationCap, Shield, Stethoscope, Users, Leaf, Calendar, DollarSign } from "lucide-react";
import { Link } from "wouter";
import type { Charity } from "@shared/schema";

const categoryIcons = {
  environment: Leaf,
  education: GraduationCap,
  healthcare: Stethoscope,
  poverty: Heart,
  disaster: Shield,
  community: Users,
  global: Globe,
};

interface CharityCardProps {
  charity: Charity;
}

export function CharityCard({ charity }: CharityCardProps) {
  const IconComponent = categoryIcons[charity.category as keyof typeof categoryIcons] || Heart;
  const goalAmount = parseFloat(charity.goalAmount);
  const raisedAmount = parseFloat(charity.raisedAmount);
  const progressPercentage = goalAmount > 0 ? Math.min((raisedAmount / goalAmount) * 100, 100) : 0;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = charity.endDate && new Date(charity.endDate) < new Date();

  return (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow" data-testid={`charity-card-${charity.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <IconComponent className="h-5 w-5 text-primary" />
            <Badge variant="secondary" className="capitalize">
              {charity.category}
            </Badge>
          </div>
          {charity.isVerified && (
            <Badge variant="default" className="text-xs">
              Verified
            </Badge>
          )}
        </div>
        
        {charity.image && (
          <img
            src={charity.image}
            alt={charity.name}
            className="w-full h-48 object-cover rounded-md"
            data-testid={`charity-image-${charity.id}`}
          />
        )}
        
        <div>
          <h3 className="font-semibold text-lg line-clamp-2" data-testid={`charity-name-${charity.id}`}>
            {charity.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
            {charity.description}
          </p>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <div className="space-y-3">
          {/* Progress */}
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span data-testid={`charity-raised-${charity.id}`}>
                {formatCurrency(raisedAmount)} raised
              </span>
              <span data-testid={`charity-goal-${charity.id}`}>
                Goal: {formatCurrency(goalAmount)}
              </span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>{progressPercentage.toFixed(1)}% funded</span>
              <span data-testid={`charity-donors-${charity.id}`}>
                {charity.donorCount} donors
              </span>
            </div>
          </div>

          {/* ACP Coins Raised */}
          {parseFloat(charity.acpCoinRaised) > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <div className="w-4 h-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
              <span data-testid={`charity-acp-raised-${charity.id}`}>
                {parseFloat(charity.acpCoinRaised).toFixed(2)} ACP Coins
              </span>
            </div>
          )}

          {/* End Date */}
          {charity.endDate && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4" />
              <span className={isExpired ? "text-red-500" : "text-muted-foreground"}>
                {isExpired ? "Ended" : "Ends"}: {formatDate(charity.endDate)}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      <CardFooter className="pt-4">
        <div className="flex gap-2 w-full">
          <Link href={`/charities/${charity.id}`} className="flex-1">
            <Button variant="outline" className="w-full" data-testid={`button-view-charity-${charity.id}`}>
              View Details
            </Button>
          </Link>
          
          {charity.isActive && !isExpired && (
            <Link href={`/charities/${charity.id}/donate`} className="flex-1">
              <Button className="w-full flex items-center gap-2" data-testid={`button-donate-${charity.id}`}>
                <Heart className="h-4 w-4" />
                Donate
              </Button>
            </Link>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}