import { createHash } from "node:crypto";
import type { ContentKind, ContentSnapshot, TranslationRow } from "./published";

type VerifiedCopy = {
  source: string;
  english?: string;
  copy?: Partial<TranslationRow>;
  specs?: { original: string; dimensions: string; finishes: string };
};

// Exact fingerprints of the current public Spanish and historical English copy.
// The migration marked English as pending even where the original site already served it.
const restored: Record<string, VerifiedCopy> = {
  "collection:oasis-collection": {
    "source": "6f400e7a534d89dabeaa0d09a59ea861272a96cdf0d8c319a5e408b7773ee7a4",
    "english": "c2b5de7eea1bc089ce3ac0da8f79015348c9bd2ee27d8c8908bd93d56727e112"
  },
  "collection:terraza": {
    "source": "ca79bb330ab81d3a0494673ef6efd9df528814f655ec06ad74dfc173b6946798",
    "english": "cc5a0e90b673c2e46742a1e52cd9d703faa00fec7066eb8eedcff052e4c7d7b4"
  },
  "collection:balcones": {
    "source": "8010dec44da22704ec20aea58443b1c7855ba93967a290da29302b6208de456f",
    "english": "5189664a68c46e7a69e407aca8ad2b5c5c063fcfd6fec623b4d2ff963d0a2cf1"
  },
  "collection:piscina": {
    "source": "0a54626ec8b08b9a0d1358195abd829e10ebf68a6cb6a3ae105c866de9cca72d",
    "english": "8ef04fb398770999623c285c3f17c204a3e47491c15f5952c147f239cf6282df"
  },
  "product:candor-collection": {
    "source": "a23d8242d9391e6d4d143b70ed28ffc257cc9425d32d3745b0f4b6ff6d850c5f",
    "english": "e753beb72d57c0f2f28d1f501af1c482d9376ce0ad3a28b0731b8edff0ae6b8f",
    "copy": {
      "materials": "Galvanized steel and imported synthetic PE rattan",
      "care": "Avoid powdered or abrasive detergents. Clean with mild soap and a damp cloth or soft brush, then let air dry."
    },
    "specs": {
      "original": "66bef29c643100a28a0ba59bce2daf47e667a73a441896e3bd4c38ffcbfbc237",
      "dimensions": "Sofa: 78 x 30 in. Armchair: 27 x 30 in. Table: 20 x 30 in.",
      "finishes": "Neutral tones subject to availability"
    }
  },
  "product:trap-set": {
    "source": "ec745aa1725155c6075d7ad6fea446a544a8f833ba7d3c6da143d9737a2611e2",
    "english": "59294c5e7db368c514cfe3e8ed745b48e56b839e30e30b03f8902fb3890b4362",
    "copy": {
      "materials": "Synthetic PE rattan and galvanized steel.",
      "care": "Clean with a damp cloth and mild soap, then let air dry.",
      "name": "Trap Collection"
    },
    "specs": {
      "original": "eb75445342d086bf465983b47b6840990d753592112bf3124876b7499acd8f6b",
      "dimensions": "Dimensions depend on the configuration and are subject to confirmation.",
      "finishes": "Finishes subject to availability."
    }
  },
  "product:candor-clasico": {
    "source": "5794141570f63cb7a8d0d1d79b123d83fcb549274b10c3476e20e7abadd151d7",
    "english": "72919968dc6009bcb582812d009c68f9418db5c2a98388b6c495ca160bf29a40",
    "copy": {
      "materials": "Synthetic rattan with a galvanized steel frame.",
      "care": "Avoid powdered or abrasive detergents. Wash cushion covers on a delicate cycle."
    },
    "specs": {
      "original": "321eb47b4ef7c10dce21756986bf8e273a75b7e294bc926d649bbe462422a081",
      "dimensions": "Armchair: 27 x 30 in. Table 1: 22 in. Table 2: 30 in.",
      "finishes": "Neutral tones and finishes subject to availability."
    }
  },
  "product:dulce-luna": {
    "source": "0faf0707a51e3cff07ec3927ce4dbfebdf4b6f088e6a30c7af2d16d313ae0675",
    "english": "abfa4cfc6ab8e1c0d32a178b064a8df1eb91172030aa646e52d9bd39d4ad6dc6",
    "copy": {
      "materials": "Outdoor-grade synthetic rattan and galvanized steel.",
      "care": "Clean the weave with a soft brush, water and a mild cleaner.",
      "name": "Dulce Luna"
    },
    "specs": {
      "original": "a1978e2325fdd68558d9365ebe47f49ebd51b526b5313435b93d623ef00290e6",
      "dimensions": "Requires 140 in. of space. Dimensions can be customized.",
      "finishes": "Finishes subject to availability."
    }
  },
  "product:candor-set": {
    "source": "38264463a26a91a8fb46120502d8b90ba44125d360a8a3a66ee6f77de4686958",
    "english": "7b1f8155177f91cb1b18836fd70e508014115bfb44e007404f5f59841babb6a9",
    "copy": {
      "materials": "Synthetic rattan with a sturdy galvanized steel frame.",
      "care": "Clean with mild soap and a damp cloth.",
      "name": "Candor Dining Set"
    },
    "specs": {
      "original": "4222e53fc66004d4816e6e562a694c83deec4c0906df43ef2a87559c8d38135b",
      "dimensions": "Table: 63 x 34 in. Chairs: 22 x 22 in.",
      "finishes": "Neutral finishes subject to availability."
    }
  },
  "product:daybed-trap": {
    "source": "823ffb8ff737f4d90f08eae47dcb4467524bda86040c5589a9dde1648d35e24a",
    "english": "520a00ef907765031c26f88958f4b15ab40d8768ca1a03784e3c2de14f588e44",
    "copy": {
      "materials": "Synthetic PE rattan and galvanized steel profiles.",
      "care": "Wipe with a damp cloth or use a soft brush for stubborn dirt. Avoid powdered detergents.",
      "name": "Trap Collection Daybed"
    },
    "specs": {
      "original": "6070974336308bab3ac8d287667f5aaca2404af3ba17a272232916230b3b3721",
      "dimensions": "60 x 80 in.",
      "finishes": "Finishes subject to availability."
    }
  },
  "product:furniture-daybed": {
    "source": "63d05e55f8ad266d3849bcf35ae23828d673f08c033a64884f60b738668bf292",
    "english": "847442507d6b0aba7efe9ccb7b9446b1f462685b413afc966703cc9655000b7d",
    "copy": {
      "materials": "Galvanized steel and synthetic PE rattan designed for sun, humidity and frequent use.",
      "care": "Clean the frame with a damp cloth and mild soap.",
      "name": "Outdoor Furniture Set + Daybed"
    },
    "specs": {
      "original": "f856971861d780cbe5a9d18087449cfc06aebc91e6181cc4cc9386c122903069",
      "dimensions": "Ask for available dimensions.",
      "finishes": "Neutral tones subject to availability."
    }
  },
  "product:candor-mix-collection": {
    "source": "40587e27a1bb48baf1342b56f495d5aa2c48da928eeb90a8083c25d66902ed60",
    "english": "54cb6b78d9891c31e28e099c4e0377c07ef58c04d3b8d7ce4f7803f22606cee3",
    "copy": {
      "materials": "Galvanized steel and synthetic PE rattan",
      "care": "Wipe with a damp cloth and mild soap, then let air dry."
    },
    "specs": {
      "original": "e0c4cf0c5d469b69a2c7eebfa1911c2d8d204844e7434c06e101e18ad2dd7333",
      "dimensions": "Ask for available configurations and dimensions.",
      "finishes": "Finishes subject to availability."
    }
  },
  "site:site.settings": {
    "source": "3645941914a3e79ae2c18b0f0a8be537a81fdd81d37eb00548cbad555eb176b1",
    "english": "38daed74d73ffcd12c2b9882f4ceb32e78af62f7b3133918bec4be3d43f9332b"
  },
  "site:page.contact": {
    "source": "49bc7bc4bfe843bd1d02ad133ab389113ec7ed31d2dc5970862b347e57ff4665",
    "english": "858da0a8b074398aae7710a2d8a90d9da7a56d6e0db94c3f92326623e674ca81"
  },
  "site:site.navigation": {
    "source": "e50a12e4cd7d5cd7ffe8adedf3b83d1d4545f49cbbd6e20b0a459fe341d44a8d",
    "english": "1e40772d6382eac836eea8cb9e80152ee4552c6818c6aae6a9aaa0e34f6ecb53"
  },
  "site:announcement.24cda84e-3296-41dd-91be-1e8e0ff17510": {
    "source": "28ccdacb063cd8391a9609f61b8437bf8d4884b6d1b671ecc687123706f3d098",
    "copy": {
      "value": {
        "title": "5% off rocking chairs",
        "message": "Get 5% off selected items.",
        "cta": "Ask about available models"
      }
    }
  },
  "site:site.footer": {
    "source": "d2dcf827560f019b864c9eaa40632976b06d6fcd9bc29a60c9a743786a974b3a",
    "english": "9a179d338cf3c16e36935fefbfd5b4405a77fcfed030b05f2ea5889ed1803c84"
  },
  "site:page.projects": {
    "source": "38eab67a11de8cce401e24f41e38832bc58ad1ebfe280f1999f1427d1f03af78",
    "english": "2e12bdf2a326654bd7f3c39a889f6382dca19ebe5cabc330f2b20679571d0bf0"
  },
  "site:page.about": {
    "source": "0a3b49921f67bdcef956f1aece07e1568ddafe80e7c9135f7d3dfffe3cc31b34",
    "english": "037dcd6f675f4a8a02f59eb08f776440ea12d62b9074be71ab6a7dc57c9d3f29"
  }
};

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    const fields = value as Record<string, unknown>;
    return Object.fromEntries(Object.keys(fields).sort().map((key) => [key, canonical(fields[key])]));
  }
  return value;
}

function fingerprint(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function copyFingerprint({ locale: _locale, translation_status: _status, ...fields }: TranslationRow) {
  return fingerprint(fields);
}

export function restorePublicEnglish(kind: ContentKind, slug: string, snapshot: ContentSnapshot): ContentSnapshot {
  const verified = restored[kind + ":" + slug];
  if (!verified) return snapshot;
  const es = snapshot.translations.find((row) => row.locale === "es");
  const en = snapshot.translations.find((row) => row.locale === "en");
  if (!es || copyFingerprint(es) !== verified.source || en?.translation_status === "complete") return snapshot;
  if (verified.english ? !en || copyFingerprint(en) !== verified.english : Boolean(en)) return snapshot;
  const english: TranslationRow = { ...en, ...verified.copy, locale: "en", translation_status: "complete" };
  return { ...snapshot, translations: [...snapshot.translations.filter((row) => row.locale !== "en"), english] };
}

export function restoredProductSpecs(snapshot: ContentSnapshot) {
  const specs = restored["product:" + snapshot.slug]?.specs;
  return specs?.original === fingerprint([snapshot.dimensions, snapshot.finishes]) ? specs : undefined;
}
