"""Request/response models for the API."""
from typing import List, Optional

from pydantic import BaseModel


class RemoveDotsRequest(BaseModel):
    text: str


class TextResponse(BaseModel):
    text: str


class RestoreDotsRequest(BaseModel):
    text: str
    method: str
    model: Optional[str] = None
    apiKey: Optional[str] = None


class RestoreResponse(BaseModel):
    text: str
    method: str


class MethodInfo(BaseModel):
    id: str
    label: str
    available: bool
    requiresKey: bool


class MethodsResponse(BaseModel):
    methods: List[MethodInfo]
