import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Video, VideoOff, Mic, MicOff, Monitor, PhoneOff, Camera } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VideoChatProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  recipientId: string;
  currentUserId: string;
  isUserPremium: boolean;
}

export function VideoChat({ 
  isOpen, 
  onClose, 
  recipientName, 
  recipientId, 
  currentUserId, 
  isUserPremium 
}: VideoChatProps) {
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [callStatus, setCallStatus] = useState<"connecting" | "connected" | "ended">("connecting");
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  
  const { toast } = useToast();

  // Initialize WebRTC peer connection
  useEffect(() => {
    if (!isOpen || !isUserPremium) return;

    // Configure ICE servers (using free STUN servers)
    const configuration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    };

    const peerConnection = new RTCPeerConnection(configuration);
    peerConnectionRef.current = peerConnection;

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
        setCallStatus("connected");
      }
    };

    // Handle ICE connection state changes
    peerConnection.oniceconnectionstatechange = () => {
      console.log("ICE connection state:", peerConnection.iceConnectionState);
      if (peerConnection.iceConnectionState === "disconnected" || 
          peerConnection.iceConnectionState === "failed") {
        setCallStatus("ended");
      }
    };

    startLocalVideo();

    return () => {
      endCall();
    };
  }, [isOpen, isUserPremium]);

  // Start local video stream
  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });
      
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Add stream to peer connection
      if (peerConnectionRef.current) {
        stream.getTracks().forEach(track => {
          peerConnectionRef.current?.addTrack(track, stream);
        });
      }
    } catch (error) {
      console.error("Error accessing media devices:", error);
      toast({
        title: "Camera/Microphone Access Denied",
        description: "Please allow camera and microphone access to use video chat",
        variant: "destructive",
      });
    }
  };

  // Toggle video
  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  // Toggle audio
  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // Start screen sharing
  const startScreenShare = async () => {
    if (!isUserPremium) {
      toast({
        title: "Premium Feature",
        description: "Screen sharing is available for premium users only",
        variant: "destructive",
      });
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      // Replace video track with screen share
      if (peerConnectionRef.current && localStreamRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === "video"
        );
        
        if (sender) {
          await sender.replaceTrack(screenStream.getVideoTracks()[0]);
        }
      }

      // Update local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = screenStream;
      }

      setIsScreenSharing(true);

      // Handle screen share ending
      screenStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error("Error starting screen share:", error);
      toast({
        title: "Screen Share Failed",
        description: "Unable to start screen sharing",
        variant: "destructive",
      });
    }
  };

  // Stop screen sharing
  const stopScreenShare = async () => {
    setIsScreenSharing(false);
    
    // Get camera stream again
    try {
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: isAudioEnabled
      });

      // Replace screen share with camera
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find(s => 
          s.track && s.track.kind === "video"
        );
        
        if (sender) {
          await sender.replaceTrack(cameraStream.getVideoTracks()[0]);
        }
      }

      // Update local video display
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = cameraStream;
      }

      localStreamRef.current = cameraStream;
    } catch (error) {
      console.error("Error returning to camera:", error);
    }
  };

  // End call
  const endCall = () => {
    // Stop all tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    setCallStatus("ended");
    onClose();
  };

  if (!isUserPremium) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Video className="h-5 w-5 mr-2" />
              Premium Feature Required
            </DialogTitle>
          </DialogHeader>
          <div className="text-center py-6">
            <div className="mb-4">
              <Badge variant="outline" className="text-sm">
                Premium Only
              </Badge>
            </div>
            <p className="text-gray-600 mb-4">
              Video calling and screen sharing are available for premium subscribers only.
            </p>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[600px] p-0">
        <div className="h-full flex flex-col bg-gray-900 text-white rounded-lg overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-4 bg-gray-800">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Video className="h-5 w-5 mr-2" />
                Video Call with {recipientName}
              </div>
              <Badge variant={callStatus === "connected" ? "default" : "secondary"}>
                {callStatus === "connecting" && "Connecting..."}
                {callStatus === "connected" && "Connected"}
                {callStatus === "ended" && "Call Ended"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Video Area */}
          <div className="flex-1 relative">
            {/* Remote Video (Main) */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover bg-gray-800"
              data-testid="remote-video"
            />
            
            {/* Local Video (Picture-in-Picture) */}
            <div className="absolute top-4 right-4 w-48 h-36 bg-gray-700 rounded-lg overflow-hidden border-2 border-gray-600">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
                data-testid="local-video"
              />
              {isScreenSharing && (
                <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                  Screen Sharing
                </div>
              )}
            </div>

            {/* Call Status Overlay */}
            {callStatus === "connecting" && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Connecting to {recipientName}...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="p-4 bg-gray-800 flex justify-center space-x-4">
            <Button
              variant={isVideoEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleVideo}
              data-testid="button-toggle-video"
            >
              {isVideoEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isAudioEnabled ? "default" : "destructive"}
              size="sm"
              onClick={toggleAudio}
              data-testid="button-toggle-audio"
            >
              {isAudioEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            
            <Button
              variant={isScreenSharing ? "destructive" : "outline"}
              size="sm"
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              data-testid="button-screen-share"
            >
              <Monitor className="h-4 w-4" />
              {isScreenSharing ? "Stop Share" : "Share Screen"}
            </Button>
            
            <Button
              variant="destructive"
              size="sm"
              onClick={endCall}
              data-testid="button-end-call"
            >
              <PhoneOff className="h-4 w-4" />
              End Call
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}