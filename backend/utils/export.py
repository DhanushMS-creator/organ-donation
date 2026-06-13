"""
Data Export Utilities
Supports JSON and CSV/HTML Table export formats with sorting capabilities
"""

import json
import csv
from io import StringIO
from typing import List, Any, Dict
import pandas as pd

from backend.models.schemas import (
    PatientRegistration,
    MatchOutput,
    TransportRoute,
    Notification,
    ErrorHandling
)


class DataExporter:
    """
    Handles data export in multiple formats
    """
    
    @staticmethod
    def to_json(data: List[Any], indent: int = 2) -> str:
        """
        Export data to JSON format
        
        Args:
            data: List of Pydantic models or dictionaries
            indent: JSON indentation level
            
        Returns:
            JSON string
        """
        # Convert Pydantic models to dictionaries
        if data and hasattr(data[0], 'model_dump'):
            data = [item.model_dump() for item in data]
        
        return json.dumps(data, indent=indent, default=str)
    
    @staticmethod
    def to_csv(data: List[Any]) -> str:
        """
        Export data to CSV format
        
        Args:
            data: List of Pydantic models or dictionaries
            
        Returns:
            CSV string
        """
        if not data:
            return ""
        
        # Convert Pydantic models to dictionaries
        if hasattr(data[0], 'model_dump'):
            data = [item.model_dump() for item in data]
        
        # Flatten nested structures
        flattened_data = []
        for item in data:
            flattened_item = DataExporter._flatten_dict(item)
            flattened_data.append(flattened_item)
        
        # Create CSV
        output = StringIO()
        if flattened_data:
            writer = csv.DictWriter(output, fieldnames=flattened_data[0].keys())
            writer.writeheader()
            writer.writerows(flattened_data)
        
        return output.getvalue()
    
    @staticmethod
    def to_html_table(data: List[Any], table_class: str = "data-table") -> str:
        """
        Export data to HTML table format
        
        Args:
            data: List of Pydantic models or dictionaries
            table_class: CSS class for the table
            
        Returns:
            HTML table string
        """
        if not data:
            return f'<table class="{table_class}"><tr><td>No data available</td></tr></table>'
        
        # Convert Pydantic models to dictionaries
        if hasattr(data[0], 'model_dump'):
            data = [item.model_dump() for item in data]
        
        # Flatten nested structures
        flattened_data = []
        for item in data:
            flattened_item = DataExporter._flatten_dict(item)
            flattened_data.append(flattened_item)
        
        # Use pandas for nice HTML table generation
        df = pd.DataFrame(flattened_data)
        html = df.to_html(classes=table_class, index=False, escape=True)
        
        return html
    
    @staticmethod
    def _flatten_dict(d: Dict, parent_key: str = '', sep: str = '_') -> Dict:
        """
        Flatten nested dictionary structure
        
        Args:
            d: Dictionary to flatten
            parent_key: Parent key prefix
            sep: Separator for nested keys
            
        Returns:
            Flattened dictionary
        """
        items = []
        for k, v in d.items():
            new_key = f"{parent_key}{sep}{k}" if parent_key else k
            
            if isinstance(v, dict):
                items.extend(DataExporter._flatten_dict(v, new_key, sep=sep).items())
            elif isinstance(v, list):
                # Convert lists to comma-separated strings
                if v and isinstance(v[0], dict):
                    # Skip complex nested structures
                    items.append((new_key, str(len(v)) + " items"))
                else:
                    items.append((new_key, ", ".join(map(str, v))))
            else:
                items.append((new_key, v))
        
        return dict(items)
    
    @staticmethod
    def export_patients(
        patients: List[PatientRegistration],
        format: str = "json",
        sort_by: str = "urgency_level",
        reverse: bool = True
    ) -> str:
        """
        Export patient data with sorting
        
        Args:
            patients: List of patient registrations
            format: Export format (json, csv, html)
            sort_by: Field to sort by
            reverse: Sort in descending order if True
            
        Returns:
            Formatted export string
        """
        # Sort patients
        sorted_patients = sorted(
            patients,
            key=lambda p: getattr(p, sort_by, 0),
            reverse=reverse
        )
        
        if format == "json":
            return DataExporter.to_json(sorted_patients)
        elif format == "csv":
            return DataExporter.to_csv(sorted_patients)
        elif format == "html":
            return DataExporter.to_html_table(sorted_patients)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    @staticmethod
    def export_matches(
        matches: List[MatchOutput],
        format: str = "json",
        sort_by: str = "match_score",
        reverse: bool = True
    ) -> str:
        """
        Export match data with sorting
        
        Args:
            matches: List of match outputs
            format: Export format (json, csv, html)
            sort_by: Field to sort by
            reverse: Sort in descending order if True
            
        Returns:
            Formatted export string
        """
        # Sort matches
        sorted_matches = sorted(
            matches,
            key=lambda m: getattr(m, sort_by, 0),
            reverse=reverse
        )
        
        if format == "json":
            return DataExporter.to_json(sorted_matches)
        elif format == "csv":
            return DataExporter.to_csv(sorted_matches)
        elif format == "html":
            return DataExporter.to_html_table(sorted_matches)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    @staticmethod
    def export_routes(
        routes: List[TransportRoute],
        format: str = "json",
        sort_by: str = "estimated_time_min",
        reverse: bool = False
    ) -> str:
        """
        Export route data with sorting
        
        Args:
            routes: List of transport routes
            format: Export format (json, csv, html)
            sort_by: Field to sort by
            reverse: Sort in descending order if True
            
        Returns:
            Formatted export string
        """
        # Sort routes
        if sort_by == "risk_level":
            risk_order = {"low": 1, "moderate": 2, "high": 3}
            sorted_routes = sorted(
                routes,
                key=lambda r: risk_order.get(r.risk_level.value, 0),
                reverse=reverse
            )
        else:
            sorted_routes = sorted(
                routes,
                key=lambda r: getattr(r, sort_by, 0),
                reverse=reverse
            )
        
        if format == "json":
            return DataExporter.to_json(sorted_routes)
        elif format == "csv":
            return DataExporter.to_csv(sorted_routes)
        elif format == "html":
            return DataExporter.to_html_table(sorted_routes)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    @staticmethod
    def export_notifications(
        notifications: List[Notification],
        format: str = "json"
    ) -> str:
        """
        Export notification data
        
        Args:
            notifications: List of notifications
            format: Export format (json, csv, html)
            
        Returns:
            Formatted export string
        """
        if format == "json":
            return DataExporter.to_json(notifications)
        elif format == "csv":
            return DataExporter.to_csv(notifications)
        elif format == "html":
            return DataExporter.to_html_table(notifications)
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    @staticmethod
    def export_errors(
        errors: List[ErrorHandling],
        format: str = "json",
        sort_by: str = "severity",
        reverse: bool = True
    ) -> str:
        """
        Export error data with sorting
        
        Args:
            errors: List of error handling objects
            format: Export format (json, csv, html)
            sort_by: Field to sort by
            reverse: Sort in descending order if True
            
        Returns:
            Formatted export string
        """
        # Sort errors
        if sort_by == "severity":
            severity_order = {"low": 1, "medium": 2, "high": 3, "critical": 4}
            sorted_errors = sorted(
                errors,
                key=lambda e: severity_order.get(e.severity, 0),
                reverse=reverse
            )
        else:
            sorted_errors = sorted(
                errors,
                key=lambda e: getattr(e, sort_by, 0),
                reverse=reverse
            )
        
        if format == "json":
            return DataExporter.to_json(sorted_errors)
        elif format == "csv":
            return DataExporter.to_csv(sorted_errors)
        elif format == "html":
            return DataExporter.to_html_table(sorted_errors)
        else:
            raise ValueError(f"Unsupported format: {format}")
