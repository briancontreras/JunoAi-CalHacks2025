
import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface LocationDetectorProps {
  onLocationChange: (location: string) => void;
  currentLocation: string;
}

const LocationDetector: React.FC<LocationDetectorProps> = ({ onLocationChange, currentLocation }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const { toast } = useToast();

  const states = [
    'California', 'New York', 'Texas', 'Florida', 'Illinois', 'Pennsylvania',
    'Ohio', 'Georgia', 'North Carolina', 'Michigan', 'New Jersey', 'Virginia',
    'Washington', 'Arizona', 'Massachusetts', 'Tennessee', 'Indiana', 'Maryland',
    'Missouri', 'Wisconsin', 'Colorado', 'Minnesota', 'South Carolina', 'Alabama'
  ];

  const detectLocation = async () => {
    setIsDetecting(true);
  
    try {
      if ('geolocation' in navigator) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 10000,
            enableHighAccuracy: true
          });
        });
  
        const { latitude, longitude } = position.coords;
  
        // Call your backend /location endpoint with coordinates
        const response = await fetch("http://localhost:8000/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat: latitude, lon: longitude }),
        });
  
        if (!response.ok) throw new Error("Failed to get location from server");
  
        const data = await response.json();
  
        if (data.error) {
          throw new Error(data.error);
        }
  
        // Use state or fallback to city if you want
        const detectedLocation = data.state || data.city || "Unknown";
  
        onLocationChange(detectedLocation);
  
        toast({
          title: "Location Detected",
          description: `Your location has been set to ${detectedLocation}`,
        });
      } else {
        throw new Error('Geolocation not supported');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      toast({
        title: "Location Detection Failed",
        description: error.message || "Please select your location manually",
        variant: "destructive"
      });
    } finally {
      setIsDetecting(false);
    }
  };
  

  const handleStateSelect = (state: string) => {
    onLocationChange(state);
    toast({
      title: "Location Updated",
      description: `Legal information will be based on ${state} law`,
    });
  };

  return (
    <div className="flex items-center space-x-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center space-x-1 text-xs sm:text-sm px-2 sm:px-3 touch-manipulation">
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="max-w-[60px] sm:max-w-none truncate">{currentLocation}</span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-60 overflow-y-auto w-48 z-50" align="end">
          {states.map((state) => (
            <DropdownMenuItem
              key={state}
              onClick={() => handleStateSelect(state)}
              className={`${currentLocation === state ? 'bg-blue-50' : ''} touch-manipulation py-3`}
            >
              {state}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={detectLocation}
        disabled={isDetecting}
        className="flex items-center p-2 touch-manipulation"
      >
        <MapPin className={`w-3 h-3 sm:w-4 sm:h-4 ${isDetecting ? 'animate-pulse' : ''}`} />
      </Button>
    </div>
  );
};

export default LocationDetector;
