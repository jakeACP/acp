import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function ApiStatusNotice() {
  return (
    <Alert className="mb-6 border-amber-200 bg-amber-50">
      <Info className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-800">Representative Data Source</AlertTitle>
      <AlertDescription className="text-amber-700">
        Google retired their Representatives API in 2025. We show current federal representatives and provide 
        direct links to find your specific state and local officials. For the most comprehensive and up-to-date 
        contact information, visit{" "}
        <a 
          href="https://www.usa.gov/elected-officials" 
          target="_blank" 
          rel="noopener noreferrer"
          className="underline font-medium"
        >
          USA.gov Elected Officials
        </a>
        {" "}and your state's official website.
      </AlertDescription>
    </Alert>
  );
}