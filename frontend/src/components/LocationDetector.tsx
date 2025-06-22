import React, { useState } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Location {
  city: string;
  state: string;
}

interface LocationDetectorProps {
  onLocationChange: (location: Location) => void;
  currentLocation: Location;
}

const LocationDetector: React.FC<LocationDetectorProps> = ({ onLocationChange, currentLocation }) => {
  const [isDetecting, setIsDetecting] = useState(false);
  const { toast } = useToast();

  const states = [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming"
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
  
        // Send city and state back as object
        const detectedLocation = {
          city: data.city || "Unknown City",
          state: data.state || "Unknown State"
        };
  
        onLocationChange(detectedLocation);
  
        toast({
          title: "Location Detected",
          description: `Your location has been set to ${detectedLocation.city}, ${detectedLocation.state}`,
        });
      } else {
        throw new Error('Geolocation not supported');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
  
      toast({
        title: "Location Detection Failed",
        description: message || "Please select your location manually",
        variant: "destructive"
      });
    } finally {
      setIsDetecting(false);
    }
  };

  // When user selects a state from dropdown, update state and clear city
  const handleStateSelect = (state: string) => {
    onLocationChange({ city: "", state }); // city reset, state updated
    toast({
      title: "Location Updated",
      description: `Legal information will be based on ${state} law`,
    });
  };

  return (
    <div className="flex items-center space-x-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center space-x-1 text-xs sm:text-sm px-2 sm:px-3 touch-manipulation"
          >
            <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
            {/* Display city and state, fallback to unknown if empty */}
            <span className="max-w-[100px] sm:max-w-none truncate">
              {currentLocation.city ? `${currentLocation.city}, ` : ""}
              {currentLocation.state || "Select State"}
            </span>
            <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-60 overflow-y-auto w-48 z-50" align="end">
          {states.map((state) => (
            <DropdownMenuItem
              key={state}
              onClick={() => handleStateSelect(state)}
              className={`${currentLocation.state === state ? 'bg-blue-50' : ''} touch-manipulation py-3`}
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
