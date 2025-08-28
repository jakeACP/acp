import { useParams } from "wouter";
import { ModularProfile } from "@/components/modular-profile";
import { useQuery } from "@tanstack/react-query";

export default function ProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: currentUser } = useQuery({ queryKey: ["/api/user"] });
  
  const isOwner = !userId || userId === currentUser?.id;
  const targetUserId = userId || currentUser?.id;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <ModularProfile 
          userId={targetUserId} 
          isOwner={isOwner}
        />
      </div>
    </div>
  );
}