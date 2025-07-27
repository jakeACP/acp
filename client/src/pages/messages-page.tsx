import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";
import { Message } from "@shared/schema";
import { MessageCircle, Send } from "lucide-react";

export default function MessagesPage() {
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  if (isLoading) {
    return (
      <div className="bg-slate-50 min-h-screen">
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">Loading messages...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Messages
                </CardTitle>
                <CardDescription>
                  Direct conversations with community members
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0">
                {messages.length === 0 ? (
                  <div className="p-6 text-center">
                    <MessageCircle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {/* Mock conversation list - would be grouped by participants in real implementation */}
                    <div className="p-4 hover:bg-slate-50 cursor-pointer border-l-4 border-primary">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900">John Doe</p>
                          <p className="text-sm text-slate-600 truncate">
                            Thanks for your input on the climate poll...
                          </p>
                        </div>
                        <div className="text-xs text-slate-500">2h</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Interface */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-shrink-0">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div>
                    <CardTitle className="text-lg">John Doe</CardTitle>
                    <CardDescription>Active now</CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col p-0">
                {/* Messages Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-4">
                  <div className="text-center text-sm text-slate-500 mb-4">
                    Conversation started today
                  </div>
                  
                  {/* Sample messages */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground rounded-lg px-4 py-2 max-w-xs">
                      <p className="text-sm">
                        Hi! I saw your comment on the climate action poll. Great points about renewable energy.
                      </p>
                      <p className="text-xs opacity-75 mt-1">2:30 PM</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-start">
                    <div className="bg-slate-100 rounded-lg px-4 py-2 max-w-xs">
                      <p className="text-sm text-slate-900">
                        Thanks! I think we need more community input on these issues. Are you part of any local environmental groups?
                      </p>
                      <p className="text-xs text-slate-600 mt-1">2:32 PM</p>
                    </div>
                  </div>
                </div>
                
                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Type your message..." 
                      className="flex-1"
                    />
                    <Button size="icon">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
