"""
Spreadsheet parser service — handles .xlsx, .xls, and .csv files.
Parsing is always server-side; results are returned as structured dicts.
"""
import logging
import io
from typing import Any

import pandas as pd
import openpyxl

logger = logging.getLogger(__name__)


class SpreadsheetParser:
    """Parses spreadsheet files and returns column metadata + preview rows."""

    SUPPORTED_EXTENSIONS = (".xlsx", ".xls", ".csv")

    def parse_preview(self, file_path: str, preview_rows: int = 5) -> dict:
        """
        Parse headers and first N rows from a spreadsheet.

        Returns:
            {
                "columns": ["Column A", "Column B", ...],
                "preview": [{"Column A": "val", ...}, ...],
                "total_rows": int,
            }
        """
        df = self._load_dataframe(file_path)
        df = df.dropna(how="all")  # drop completely empty rows

        columns = [str(col) for col in df.columns.tolist()]
        preview_data = df.head(preview_rows).fillna("").to_dict(orient="records")
        preview_data = [{str(k): str(v) for k, v in row.items()} for row in preview_data]

        return {
            "columns": columns,
            "preview": preview_data,
            "total_rows": len(df),
        }

    def parse_all_rows(self, file_path: str, column_mapping: dict) -> list[dict[str, Any]]:
        """
        Parse all rows applying the column mapping.
        Each row becomes a flat dict keyed by template variable name.

        Args:
            file_path: Absolute path to the spreadsheet file.
            column_mapping: {"Column A": "recipient_name", "Column B": "email", ...}

        Returns:
            List of dicts, one per row, with template variable names as keys.
            The "email" key is guaranteed to exist (required by validation).
        """
        df = self._load_dataframe(file_path)
        df = df.dropna(how="all")

        rows = []
        for _, row in df.iterrows():
            mapped_row = {}
            for col_name, var_name in column_mapping.items():
                if col_name in df.columns:
                    mapped_row[var_name] = str(row[col_name]) if pd.notna(row[col_name]) else ""
            rows.append(mapped_row)

        return rows

    def _load_dataframe(self, file_path: str) -> pd.DataFrame:
        """Load a spreadsheet into a pandas DataFrame based on file extension."""
        path_lower = file_path.lower()

        if path_lower.endswith(".csv"):
            return pd.read_csv(file_path, dtype=str)
        elif path_lower.endswith(".xlsx") or path_lower.endswith(".xls"):
            return pd.read_excel(file_path, dtype=str, engine="openpyxl")
        else:
            raise ValueError(f"Unsupported file format: {file_path}")

    def update_spreadsheet_columns(self, file_path: str, new_columns: list[str], campaign=None) -> None:
        """
        Append missing columns to an existing spreadsheet (.xlsx, .xls, or .csv).
        """
        df = self._load_dataframe(file_path)
        existing_cols_lower = [str(col).lower().strip() for col in df.columns]

        added_any = False
        for col in new_columns:
            col_clean = col.strip()
            if col_clean.lower() not in existing_cols_lower:
                df[col_clean] = ""
                added_any = True

        if added_any:
            path_lower = file_path.lower()
            if path_lower.endswith(".csv"):
                df.to_csv(file_path, index=False)
            elif path_lower.endswith(".xlsx") or path_lower.endswith(".xls"):
                if path_lower.endswith(".xls"):
                    # Excel 97-2003 formats can't be easily written by openpyxl, so we convert it to .xlsx
                    new_path = file_path + "x"
                    df.to_excel(new_path, index=False, engine="openpyxl")
                    import os
                    if os.path.exists(file_path):
                        try:
                            os.remove(file_path)
                        except OSError as e:
                            logger.error("Failed to remove old .xls file %s: %s", file_path, e)
                    if campaign:
                        # Update campaign's spreadsheet_file name
                        rel_name = campaign.spreadsheet_file.name + "x"
                        campaign.spreadsheet_file.name = rel_name
                        campaign.save(update_fields=["spreadsheet_file"])
                else:
                    df.to_excel(file_path, index=False, engine="openpyxl")

