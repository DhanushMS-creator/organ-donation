"""
Transport Route Planning and Optimization Module
Generates optimal routes for organ transportation with green corridor support
"""

import random
from typing import List, Tuple
from datetime import datetime
from haversine import haversine, Unit

from backend.models.schemas import Location, TransportRoute, RiskLevel, Notification, RecipientType


class RouteOptimizer:
    """
    Route planning and optimization for organ transport
    """
    
    def __init__(
        self,
        avg_speed_kmh: float = 60.0,
        traffic_speed_reduction: float = 0.7,
        green_corridor_speed_boost: float = 1.3
    ):
        """
        Initialize route optimizer
        
        Args:
            avg_speed_kmh: Average travel speed (default 60 km/h)
            traffic_speed_reduction: Speed reduction factor in traffic (default 0.7)
            green_corridor_speed_boost: Speed boost with green corridor (default 1.3)
        """
        self.avg_speed_kmh = avg_speed_kmh
        self.traffic_speed_reduction = traffic_speed_reduction
        self.green_corridor_speed_boost = green_corridor_speed_boost
    
    def calculate_distance(self, origin: Location, destination: Location) -> float:
        """
        Calculate distance between two locations
        
        Args:
            origin: Starting location
            destination: Ending location
            
        Returns:
            Distance in kilometers
        """
        point1 = (origin.lat, origin.lng)
        point2 = (destination.lat, destination.lng)
        return haversine(point1, point2, unit=Unit.KILOMETERS)
    
    def generate_waypoints(
        self,
        origin: Location,
        destination: Location,
        route_variant: int = 0
    ) -> List[str]:
        """
        Generate turn-by-turn directions for a route
        
        Args:
            origin: Starting location
            destination: Ending location
            route_variant: Route variant number (0-3 for different routes)
            
        Returns:
            List of direction strings
        """
        # In a production system, this would integrate with Google Maps API,
        # OpenStreetMap, or similar mapping service
        
        # For now, generate generic but realistic directions
        directions = []
        
        # Starting point
        directions.append(f"Start at coordinates ({origin.lat:.4f}, {origin.lng:.4f})")
        
        # Route-specific middle directions
        if route_variant == 0:
            # Direct/fastest route
            directions.extend([
                "Take the main highway/expressway",
                "Continue straight for majority of journey",
                "Exit at designated off-ramp near destination"
            ])
        elif route_variant == 1:
            # Alternative arterial road route
            directions.extend([
                "Take arterial road north/south",
                "Follow main road through city center",
                "Turn at major intersection near destination"
            ])
        elif route_variant == 2:
            # Bypass/ring road route
            directions.extend([
                "Take ring road/bypass route",
                "Avoid city center congestion",
                "Exit at outer ring junction"
            ])
        else:
            # Emergency/shortest route
            directions.extend([
                "Take emergency shortest path",
                "May include narrow roads",
                "Prioritize time over comfort"
            ])
        
        # Ending point
        directions.append(f"Arrive at destination ({destination.lat:.4f}, {destination.lng:.4f})")
        
        return directions
    
    def assess_risk_level(
        self,
        distance_km: float,
        traffic_status: str,
        time_of_day: int = None
    ) -> RiskLevel:
        """
        Assess risk level for a route
        
        Args:
            distance_km: Total route distance
            traffic_status: Current traffic conditions
            time_of_day: Hour of day (0-23), uses current time if None
            
        Returns:
            Risk level assessment
        """
        if time_of_day is None:
            time_of_day = datetime.utcnow().hour
        
        risk_score = 0
        
        # Distance risk
        if distance_km > 100:
            risk_score += 2
        elif distance_km > 50:
            risk_score += 1
        
        # Traffic risk
        if traffic_status in ["heavy", "congested"]:
            risk_score += 2
        elif traffic_status == "moderate":
            risk_score += 1
        
        # Time of day risk (rush hours)
        if time_of_day in [7, 8, 9, 17, 18, 19]:
            risk_score += 1
        
        # Classify risk
        if risk_score >= 4:
            return RiskLevel.HIGH
        elif risk_score >= 2:
            return RiskLevel.MODERATE
        else:
            return RiskLevel.LOW
    
    def estimate_travel_time(
        self,
        distance_km: float,
        traffic_status: str = "normal",
        green_corridor: bool = False
    ) -> int:
        """
        Estimate travel time in minutes
        
        Args:
            distance_km: Distance to travel
            traffic_status: Traffic conditions
            green_corridor: Whether green corridor is active
            
        Returns:
            Estimated time in minutes
        """
        base_speed = self.avg_speed_kmh
        
        # Adjust for traffic
        if traffic_status == "heavy":
            base_speed *= 0.5
        elif traffic_status == "moderate":
            base_speed *= self.traffic_speed_reduction
        elif traffic_status == "light":
            base_speed *= 1.1
        
        # Apply green corridor boost
        if green_corridor:
            base_speed *= self.green_corridor_speed_boost
        
        # Calculate time
        time_hours = distance_km / base_speed
        time_minutes = int(time_hours * 60)
        
        return max(1, time_minutes)  # At least 1 minute
    
    def generate_routes(
        self,
        origin: Location,
        destination: Location,
        match_id: str,
        num_routes: int = 4
    ) -> List[TransportRoute]:
        """
        Generate multiple optimal route options
        
        Args:
            origin: Starting location
            destination: Ending location
            match_id: Associated match ID for reference
            num_routes: Number of route alternatives to generate (default 4)
            
        Returns:
            List of transport routes
        """
        routes = []
        base_distance = self.calculate_distance(origin, destination)
        
        # Traffic scenarios
        traffic_scenarios = ["light", "normal", "moderate", "heavy"]
        
        for i in range(num_routes):
            # Vary distance slightly for different routes (±10%)
            distance_variance = 1.0 + (random.random() * 0.2 - 0.1)
            route_distance = base_distance * distance_variance
            
            # Select traffic status
            traffic_status = traffic_scenarios[min(i, len(traffic_scenarios) - 1)]
            
            # Generate waypoints
            waypoints = self.generate_waypoints(origin, destination, i)
            
            # Assess risk
            risk_level = self.assess_risk_level(route_distance, traffic_status)
            
            # Estimate time (first route gets green corridor)
            estimated_time = self.estimate_travel_time(
                route_distance,
                traffic_status,
                green_corridor=(i == 0)  # Preferred route gets green corridor
            )
            
            # Create route object
            route = TransportRoute(
                route_id=f"R-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{i+1}",
                origin=origin,
                destination=destination,
                distance_km=round(route_distance, 2),
                estimated_time_min=estimated_time,
                directions=waypoints,
                risk_level=risk_level,
                traffic_status=traffic_status,
                green_corridor_status="approved" if i == 0 else "pending",
                created_at=datetime.utcnow()
            )
            
            routes.append(route)
        
        # Sort by estimated time (fastest first)
        routes.sort(key=lambda r: r.estimated_time_min)
        
        return routes
    
    def create_green_corridor_notification(
        self,
        route: TransportRoute,
        match_id: str,
        organ_type: str
    ) -> Notification:
        """
        Create notification to traffic department for green corridor
        
        Args:
            route: Selected transport route
            match_id: Associated match ID
            organ_type: Type of organ being transported
            
        Returns:
            Notification object for traffic department
        """
        content = (
            f"🚨 GREEN CORRIDOR REQUEST - ORGAN TRANSPLANT\n\n"
            f"Match ID: {match_id}\n"
            f"Organ: {organ_type}\n"
            f"Route ID: {route.route_id}\n"
            f"Origin: ({route.origin.lat:.4f}, {route.origin.lng:.4f})\n"
            f"Destination: ({route.destination.lat:.4f}, {route.destination.lng:.4f})\n"
            f"Distance: {route.distance_km} km\n"
            f"Estimated Time: {route.estimated_time_min} minutes\n"
            f"Current Traffic: {route.traffic_status}\n\n"
            f"Please clear the following route:\n" +
            "\n".join(f"{idx+1}. {direction}" for idx, direction in enumerate(route.directions[:5]))
        )
        
        notification = Notification(
            alert_id=f"GC-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{route.route_id}",
            recipient_type=RecipientType.TRAFFIC,
            recipient_id="TRAFFIC-CONTROL-BANGALORE",
            content=content,
            timestamp=datetime.utcnow(),
            status="sent",
            priority="critical",
            metadata={
                "match_id": match_id,
                "route_id": route.route_id,
                "organ_type": organ_type,
                "estimated_time_min": route.estimated_time_min
            }
        )
        
        return notification
    
    def sort_routes(
        self,
        routes: List[TransportRoute],
        sort_by: str = "estimated_time_min",
        reverse: bool = False
    ) -> List[TransportRoute]:
        """
        Sort routes by specified criteria
        
        Args:
            routes: List of routes to sort
            sort_by: Field to sort by (estimated_time_min, distance_km, risk_level)
            reverse: Sort in descending order if True
            
        Returns:
            Sorted list of routes
        """
        valid_fields = ["estimated_time_min", "distance_km", "risk_level"]
        
        if sort_by not in valid_fields:
            raise ValueError(f"Invalid sort field. Must be one of: {valid_fields}")
        
        # Special handling for risk_level (enum)
        if sort_by == "risk_level":
            risk_order = {RiskLevel.LOW: 1, RiskLevel.MODERATE: 2, RiskLevel.HIGH: 3}
            return sorted(routes, key=lambda r: risk_order[r.risk_level], reverse=reverse)
        
        return sorted(routes, key=lambda r: getattr(r, sort_by), reverse=reverse)
