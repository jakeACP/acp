import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface JurisdictionRules {
  jurisdiction: {
    name: string;
    code: string;
    scope_level: string;
  };
  signature_threshold: {
    type: string;
    value: number;
  };
  distribution_requirement?: {
    counties_min?: number;
    per_county_min?: number;
    congressional_districts_min?: number;
    per_district_min?: number;
  };
  timeline: {
    max_days_collecting: number;
    submission_cutoff_days_before_election: number;
  };
  eligibility: {
    resident_required: boolean;
    registered_voter_required: boolean;
    age_min: number;
  };
  initiative_modes: {
    direct: boolean;
    indirect: boolean;
  };
  initiative_types: {
    statute: {
      enabled: boolean;
      signature_percent?: number;
    };
    constitutional_amendment: {
      enabled: boolean;
      signature_percent?: number;
    };
    ordinance: {
      enabled: boolean;
    };
  };
  circulator_rules: {
    must_be_resident: boolean;
    paid_circulator_disclosure: boolean;
    registration_required: boolean;
  };
  verification: {
    e_signature_permitted: string;
    duplicate_detection: boolean;
    address_validation: boolean;
    voter_registration_check: boolean;
  };
  validation: {
    auto_verification_threshold: number;
    manual_review_threshold: number;
    random_sample_size: number;
  };
  notes?: string;
}

export class RulesEngine {
  private rulesCache: Map<string, JurisdictionRules> = new Map();
  private rulesDir: string;

  constructor(rulesDirectory?: string) {
    this.rulesDir = rulesDirectory || path.join(__dirname, '../rules');
  }

  /**
   * Load rules for a specific jurisdiction
   */
  async loadRules(jurisdictionCode: string): Promise<JurisdictionRules> {
    if (this.rulesCache.has(jurisdictionCode)) {
      return this.rulesCache.get(jurisdictionCode)!;
    }

    const rulesPath = path.join(this.rulesDir, `${jurisdictionCode}.yaml`);
    
    if (!fs.existsSync(rulesPath)) {
      throw new Error(`Rules file not found for jurisdiction: ${jurisdictionCode}`);
    }

    try {
      const rulesContent = fs.readFileSync(rulesPath, 'utf8');
      const rules = yaml.load(rulesContent) as JurisdictionRules;
      
      this.rulesCache.set(jurisdictionCode, rules);
      return rules;
    } catch (error) {
      throw new Error(`Failed to load rules for ${jurisdictionCode}: ${error}`);
    }
  }

  /**
   * Calculate signature threshold for a given initiative type and jurisdiction
   */
  async calculateSignatureThreshold(
    jurisdictionCode: string,
    initiativeType: 'statute' | 'constitutional_amendment' | 'ordinance',
    baseVoteCount?: number
  ): Promise<number> {
    const rules = await this.loadRules(jurisdictionCode);
    
    if (!rules.initiative_types[initiativeType].enabled) {
      throw new Error(`Initiative type '${initiativeType}' not enabled in ${jurisdictionCode}`);
    }

    // Use initiative-specific percentage if available
    const initiativeTypeRules = rules.initiative_types[initiativeType];
    const signaturePercent = ('signature_percent' in initiativeTypeRules && initiativeTypeRules.signature_percent) || 
                           rules.signature_threshold.value;

    if (rules.signature_threshold.type === 'percent_of_last_gubernatorial_vote') {
      if (!baseVoteCount) {
        throw new Error('Base vote count required for percentage-based threshold');
      }
      return Math.ceil(baseVoteCount * signaturePercent);
    } else if (rules.signature_threshold.type === 'fixed_number') {
      return signaturePercent;
    } else {
      throw new Error(`Unknown threshold type: ${rules.signature_threshold.type}`);
    }
  }

  /**
   * Validate initiative eligibility for a jurisdiction
   */
  async validateInitiativeEligibility(
    jurisdictionCode: string,
    initiativeType: 'statute' | 'constitutional_amendment' | 'ordinance',
    directOrIndirect: 'direct' | 'indirect'
  ): Promise<{ valid: boolean; reason?: string }> {
    try {
      const rules = await this.loadRules(jurisdictionCode);

      // Check if initiative type is enabled
      if (!rules.initiative_types[initiativeType].enabled) {
        return {
          valid: false,
          reason: `${initiativeType} initiatives are not permitted in ${jurisdictionCode}`
        };
      }

      // Check if direct/indirect mode is supported
      if (!rules.initiative_modes[directOrIndirect]) {
        return {
          valid: false,
          reason: `${directOrIndirect} initiatives are not permitted in ${jurisdictionCode}`
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        reason: `Unable to validate eligibility: ${error}`
      };
    }
  }

  /**
   * Get circulation timeline for a jurisdiction
   */
  async getCirculationTimeline(jurisdictionCode: string): Promise<{
    maxDaysCollecting: number;
    submissionCutoffDays: number;
  }> {
    const rules = await this.loadRules(jurisdictionCode);
    return {
      maxDaysCollecting: rules.timeline.max_days_collecting,
      submissionCutoffDays: rules.timeline.submission_cutoff_days_before_election
    };
  }

  /**
   * Check circulator requirements for a jurisdiction
   */
  async getCirculatorRequirements(jurisdictionCode: string): Promise<{
    mustBeResident: boolean;
    paidDisclosureRequired: boolean;
    registrationRequired: boolean;
  }> {
    const rules = await this.loadRules(jurisdictionCode);
    return {
      mustBeResident: rules.circulator_rules.must_be_resident,
      paidDisclosureRequired: rules.circulator_rules.paid_circulator_disclosure,
      registrationRequired: rules.circulator_rules.registration_required
    };
  }

  /**
   * Get validation thresholds for signature verification
   */
  async getValidationThresholds(jurisdictionCode: string): Promise<{
    autoVerificationThreshold: number;
    manualReviewThreshold: number;
    randomSampleSize: number;
  }> {
    const rules = await this.loadRules(jurisdictionCode);
    return {
      autoVerificationThreshold: rules.validation.auto_verification_threshold,
      manualReviewThreshold: rules.validation.manual_review_threshold,
      randomSampleSize: rules.validation.random_sample_size
    };
  }

  /**
   * Clear rules cache
   */
  clearCache(): void {
    this.rulesCache.clear();
  }
}

export const rulesEngine = new RulesEngine();