import hashlib
import json
import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

LANGUAGE_PACKS: dict[str, dict[str, Any]] = {"en": {}}
LANGUAGE_PACK_VERSIONS: dict[str, Optional[str]] = {}

DIR = os.path.dirname(os.path.abspath(__file__))

def get_language_pack_filename(locale: str) -> str:
    if not locale or locale == "en":
        return DIR + "/empty_language_pack.json"
    return DIR + f"/{locale}/messages.json"

def get_language_pack_version(locale: str) -> Optional[str]:
    if locale in LANGUAGE_PACK_VERSIONS:
        return LANGUAGE_PACK_VERSIONS[locale]
    try:
        with open(get_language_pack_filename(locale), "rb") as f:
            version = hashlib.sha256(f.read()).hexdigest()[:12]
    except OSError:
        logger.warning("No language pack file to version for locale %s", locale)
        version = None
    LANGUAGE_PACK_VERSIONS[locale] = version
    return version

def get_language_pack(locale: str) -> Optional[dict[str, Any]]:
    pack = LANGUAGE_PACKS.get(locale)
    if not pack:
        filename = get_language_pack_filename(locale)
        try:
            with open(filename, encoding="utf8") as f:
                pack = json.load(f)
                LANGUAGE_PACKS[locale] = pack or {}
        except Exception:
            logger.error("Error loading language pack for locale %s", locale)
            return None 
    return pack
