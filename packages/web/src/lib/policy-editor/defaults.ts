/**
 * Policy Editor Defaults and Constants
 * 
 * This file contains all the configuration options, validation rules, and default values
 * used by child app components in the policy editor. These are ported from the React
 * application's defaults files and adapted for use in Svelte.
 * 
 * Data Sources:
 * - Static lists: Defined in this file
 * - Dynamic data (users, groups, skills, etc.): Fetched from Salesforce via page.server.ts
 */

// ============================================================================
// SPEAK APP CONFIGURATION
// ============================================================================

/**
 * Text-to-Speech voice options
 * These are Google Cloud TTS voices commonly used with Natterbox
 */
export const SPEAK_VOICE_LIST = [
  // English (United States)
  { value: 'en-US-Neural2-A', label: 'English (US) - Male 1', language: 'en-US', gender: 'MALE' },
  { value: 'en-US-Neural2-C', label: 'English (US) - Female 1', language: 'en-US', gender: 'FEMALE' },
  { value: 'en-US-Neural2-D', label: 'English (US) - Male 2', language: 'en-US', gender: 'MALE' },
  { value: 'en-US-Neural2-E', label: 'English (US) - Female 2', language: 'en-US', gender: 'FEMALE' },
  { value: 'en-US-Neural2-F', label: 'English (US) - Female 3', language: 'en-US', gender: 'FEMALE' },
  { value: 'en-US-Neural2-G', label: 'English (US) - Female 4', language: 'en-US', gender: 'FEMALE' },
  { value: 'en-US-Neural2-H', label: 'English (US) - Female 5', language: 'en-US', gender: 'FEMALE' },
  { value: 'en-US-Neural2-I', label: 'English (US) - Male 3', language: 'en-US', gender: 'MALE' },
  { value: 'en-US-Neural2-J', label: 'English (US) - Male 4', language: 'en-US', gender: 'MALE' },
  
  // English (United Kingdom)
  { value: 'en-GB-Neural2-A', label: 'English (UK) - Female 1', language: 'en-GB', gender: 'FEMALE' },
  { value: 'en-GB-Neural2-B', label: 'English (UK) - Male 1', language: 'en-GB', gender: 'MALE' },
  { value: 'en-GB-Neural2-C', label: 'English (UK) - Female 2', language: 'en-GB', gender: 'FEMALE' },
  { value: 'en-GB-Neural2-D', label: 'English (UK) - Male 2', language: 'en-GB', gender: 'MALE' },
  { value: 'en-GB-Neural2-F', label: 'English (UK) - Female 3', language: 'en-GB', gender: 'FEMALE' },
  
  // English (Australia)
  { value: 'en-AU-Neural2-A', label: 'English (AU) - Female 1', language: 'en-AU', gender: 'FEMALE' },
  { value: 'en-AU-Neural2-B', label: 'English (AU) - Male 1', language: 'en-AU', gender: 'MALE' },
  { value: 'en-AU-Neural2-C', label: 'English (AU) - Female 2', language: 'en-AU', gender: 'FEMALE' },
  { value: 'en-AU-Neural2-D', label: 'English (AU) - Male 2', language: 'en-AU', gender: 'MALE' },
  
  // Spanish
  { value: 'es-ES-Neural2-A', label: 'Spanish (Spain) - Female', language: 'es-ES', gender: 'FEMALE' },
  { value: 'es-ES-Neural2-B', label: 'Spanish (Spain) - Male', language: 'es-ES', gender: 'MALE' },
  { value: 'es-US-Neural2-A', label: 'Spanish (US) - Female', language: 'es-US', gender: 'FEMALE' },
  { value: 'es-US-Neural2-B', label: 'Spanish (US) - Male', language: 'es-US', gender: 'MALE' },
  { value: 'es-US-Neural2-C', label: 'Spanish (US) - Male 2', language: 'es-US', gender: 'MALE' },
  
  // French
  { value: 'fr-FR-Neural2-A', label: 'French (France) - Female', language: 'fr-FR', gender: 'FEMALE' },
  { value: 'fr-FR-Neural2-B', label: 'French (France) - Male', language: 'fr-FR', gender: 'MALE' },
  { value: 'fr-FR-Neural2-C', label: 'French (France) - Female 2', language: 'fr-FR', gender: 'FEMALE' },
  { value: 'fr-FR-Neural2-D', label: 'French (France) - Male 2', language: 'fr-FR', gender: 'MALE' },
  { value: 'fr-FR-Neural2-E', label: 'French (France) - Female 3', language: 'fr-FR', gender: 'FEMALE' },
  { value: 'fr-CA-Neural2-A', label: 'French (Canada) - Female', language: 'fr-CA', gender: 'FEMALE' },
  { value: 'fr-CA-Neural2-B', label: 'French (Canada) - Male', language: 'fr-CA', gender: 'MALE' },
  { value: 'fr-CA-Neural2-C', label: 'French (Canada) - Female 2', language: 'fr-CA', gender: 'FEMALE' },
  { value: 'fr-CA-Neural2-D', label: 'French (Canada) - Male 2', language: 'fr-CA', gender: 'MALE' },
  
  // German
  { value: 'de-DE-Neural2-A', label: 'German - Female', language: 'de-DE', gender: 'FEMALE' },
  { value: 'de-DE-Neural2-B', label: 'German - Male', language: 'de-DE', gender: 'MALE' },
  { value: 'de-DE-Neural2-C', label: 'German - Female 2', language: 'de-DE', gender: 'FEMALE' },
  { value: 'de-DE-Neural2-D', label: 'German - Male 2', language: 'de-DE', gender: 'MALE' },
  { value: 'de-DE-Neural2-F', label: 'German - Female 3', language: 'de-DE', gender: 'FEMALE' },
  
  // Italian
  { value: 'it-IT-Neural2-A', label: 'Italian - Female', language: 'it-IT', gender: 'FEMALE' },
  { value: 'it-IT-Neural2-B', label: 'Italian - Female 2', language: 'it-IT', gender: 'FEMALE' },
  { value: 'it-IT-Neural2-C', label: 'Italian - Male', language: 'it-IT', gender: 'MALE' },
  { value: 'it-IT-Neural2-D', label: 'Italian - Male 2', language: 'it-IT', gender: 'MALE' },
  
  // Portuguese
  { value: 'pt-BR-Neural2-A', label: 'Portuguese (Brazil) - Female', language: 'pt-BR', gender: 'FEMALE' },
  { value: 'pt-BR-Neural2-B', label: 'Portuguese (Brazil) - Male', language: 'pt-BR', gender: 'MALE' },
  { value: 'pt-BR-Neural2-C', label: 'Portuguese (Brazil) - Female 2', language: 'pt-BR', gender: 'FEMALE' },
  { value: 'pt-PT-Neural2-A', label: 'Portuguese (Portugal) - Female', language: 'pt-PT', gender: 'FEMALE' },
  { value: 'pt-PT-Neural2-B', label: 'Portuguese (Portugal) - Male', language: 'pt-PT', gender: 'MALE' },
  { value: 'pt-PT-Neural2-C', label: 'Portuguese (Portugal) - Male 2', language: 'pt-PT', gender: 'MALE' },
  { value: 'pt-PT-Neural2-D', label: 'Portuguese (Portugal) - Female 2', language: 'pt-PT', gender: 'FEMALE' },
  
  // Dutch
  { value: 'nl-NL-Neural2-A', label: 'Dutch - Female', language: 'nl-NL', gender: 'FEMALE' },
  { value: 'nl-NL-Neural2-B', label: 'Dutch - Male', language: 'nl-NL', gender: 'MALE' },
  { value: 'nl-NL-Neural2-C', label: 'Dutch - Male 2', language: 'nl-NL', gender: 'MALE' },
  { value: 'nl-NL-Neural2-D', label: 'Dutch - Female 2', language: 'nl-NL', gender: 'FEMALE' },
  { value: 'nl-NL-Neural2-E', label: 'Dutch - Female 3', language: 'nl-NL', gender: 'FEMALE' },
  
  // Japanese
  { value: 'ja-JP-Neural2-B', label: 'Japanese - Female', language: 'ja-JP', gender: 'FEMALE' },
  { value: 'ja-JP-Neural2-C', label: 'Japanese - Male', language: 'ja-JP', gender: 'MALE' },
  { value: 'ja-JP-Neural2-D', label: 'Japanese - Male 2', language: 'ja-JP', gender: 'MALE' },
  
  // Mandarin Chinese
  { value: 'cmn-CN-Neural2-A', label: 'Chinese (Mandarin) - Female', language: 'cmn-CN', gender: 'FEMALE' },
  { value: 'cmn-CN-Neural2-B', label: 'Chinese (Mandarin) - Male', language: 'cmn-CN', gender: 'MALE' },
  { value: 'cmn-CN-Neural2-C', label: 'Chinese (Mandarin) - Male 2', language: 'cmn-CN', gender: 'MALE' },
  { value: 'cmn-CN-Neural2-D', label: 'Chinese (Mandarin) - Female 2', language: 'cmn-CN', gender: 'FEMALE' },
  
  // Korean
  { value: 'ko-KR-Neural2-A', label: 'Korean - Female', language: 'ko-KR', gender: 'FEMALE' },
  { value: 'ko-KR-Neural2-B', label: 'Korean - Female 2', language: 'ko-KR', gender: 'FEMALE' },
  { value: 'ko-KR-Neural2-C', label: 'Korean - Male', language: 'ko-KR', gender: 'MALE' },
] as const;

export const DEFAULT_VOICE = 'en-US-Neural2-C';

// ============================================================================
// CALL QUEUE CONFIGURATION
// ============================================================================

/**
 * Queue distribution algorithms
 */
export const QUEUE_ALGORITHM_TYPES = [
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Distribute calls evenly across agents' },
  { value: 'LONGEST_IDLE', label: 'Longest Idle', description: 'Route to agent idle longest' },
  { value: 'LEAST_CALLS', label: 'Least Calls', description: 'Route to agent with fewest calls' },
  { value: 'RANDOM', label: 'Random', description: 'Randomly select available agent' },
  { value: 'RING_ALL', label: 'Ring All', description: 'Ring all available agents simultaneously' },
] as const;

/**
 * Skill-based routing modes
 */
export const SKILL_MODE_OPTIONS = [
  { value: 'BUILT_IN', label: 'Built-in Skills', description: 'Use Natterbox skill assignments' },
  { value: 'HOOK', label: 'Custom Hook', description: 'Use custom skill logic via hook' },
] as const;

/**
 * Skill algorithm options
 */
export const SKILL_ALGORITHM_OPTIONS = [
  { value: 'SUM', label: 'Sum', description: 'Sum all skill proficiencies' },
  { value: 'MAXIMUM', label: 'Maximum', description: 'Use highest proficiency' },
] as const;

/**
 * Hold music types
 */
export const HOLD_MUSIC_TYPES = [
  { value: 'AUTO', label: 'Auto', description: 'System default hold music' },
  { value: 'PRESET', label: 'Preset', description: 'Select from hold music presets' },
  { value: 'CUSTOM', label: 'Custom Sound', description: 'Use custom uploaded sound' },
] as const;

/**
 * Exit keys for queue escape
 */
export const EXIT_KEYS = [
  { value: '', label: 'None' },
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '*', label: '*' },
  { value: '#', label: '#' },
] as const;

/**
 * Wrap-up types
 */
export const WRAP_UP_TYPES = [
  { value: 'NONE', label: 'None' },
  { value: 'AUTO', label: 'Auto' },
  { value: 'MANUAL', label: 'Manual' },
] as const;

/**
 * Announcement types
 */
export const ANNOUNCEMENT_TYPES = [
  { value: 'TTS', label: 'Text-to-Speech' },
  { value: 'SOUND', label: 'Audio File' },
] as const;

/**
 * Chime format options
 */
export const CHIME_FORMAT_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'BEEP', label: 'Beep' },
  { value: 'RING', label: 'Ring' },
] as const;

/**
 * Key options for screen accept
 */
export const KEY_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '0', label: '0' },
  { value: '*', label: '*' },
  { value: '#', label: '#' },
] as const;

/**
 * Accept keys for screen accept (DTMF keys as string array)
 */
export const ACCEPT_KEYS = KEY_OPTIONS.map(opt => opt.value);

/**
 * Callback activation keys
 */
export const CALLBACK_ACTIVATION_KEYS = EXIT_KEYS;

/**
 * ACL (Auto Callback Location) options
 */
export const ACL_OPTIONS = [
  { value: 'CALLER_ID', label: 'Caller ID' },
  { value: 'CUSTOM', label: 'Custom Number' },
] as const;

/**
 * CLI Presentation options for callback
 */
export const CLI_PRESENTATION_OPTIONS = [
  { value: 'CALLER_ID', label: 'Original Caller ID' },
  { value: 'COMPANY', label: 'Company Number' },
  { value: 'CUSTOM', label: 'Custom Number' },
] as const;

/**
 * Max callback attempts
 */
export const MAX_CALLBACK_ATTEMPTS = [1, 2, 3, 4, 5] as const;

// ============================================================================
// HUNT GROUP CONFIGURATION
// ============================================================================

/**
 * Hunt group connect types
 */
export const HUNT_GROUP_CONNECT_TYPES = [
  { value: 'NUMBER', label: 'Phone Number' },
  { value: 'USER', label: 'User' },
  { value: 'GROUP', label: 'Group' },
] as const;

/**
 * Alias for HUNT_GROUP_CONNECT_TYPES (for backward compatibility)
 */
export const CONNECT_TO_OPTIONS = HUNT_GROUP_CONNECT_TYPES;

/**
 * Hunt group ring strategies
 */
export const HUNT_GROUP_STRATEGIES = [
  { value: 'SEQUENTIAL', label: 'Sequential', description: 'Ring targets one after another' },
  { value: 'PARALLEL', label: 'Parallel', description: 'Ring all targets simultaneously' },
  { value: 'ROUND_ROBIN', label: 'Round Robin', description: 'Rotate starting point' },
] as const;

// ============================================================================
// RULE CONFIGURATION
// ============================================================================

/**
 * Rule types
 */
export const RULE_TYPES = [
  { value: 'timeOfDay', label: 'Time of Day', description: 'Route based on time/date' },
  { value: 'countryCode', label: 'Country Code', description: 'Route based on caller location' },
  { value: 'callerIdWithheld', label: 'Caller ID Withheld', description: 'Check if caller ID is hidden' },
  { value: 'numberMatch', label: 'Number Match', description: 'Match specific phone numbers' },
  { value: 'evaluate', label: 'Evaluate Property', description: 'Evaluate call property values' },
] as const;

/**
 * Number type options for rules
 */
export const NUMBER_TYPE_OPTIONS = [
  { value: 'CALLING', label: 'Calling Number (Caller ID)' },
  { value: 'CALLED', label: 'Called Number (DDI)' },
] as const;

/**
 * Country code match types
 */
export const COUNTRY_CODE_MATCH_OPTIONS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Does Not Equal' },
] as const;

/**
 * Number match operators
 */
export const NUMBER_MATCH_OPTIONS = [
  { value: 'EQUALS', label: 'Equals' },
  { value: 'NOT_EQUALS', label: 'Does Not Equal' },
  { value: 'STARTS_WITH', label: 'Starts With' },
  { value: 'ENDS_WITH', label: 'Ends With' },
  { value: 'CONTAINS', label: 'Contains' },
  { value: 'MATCHES', label: 'Matches Pattern (Regex)' },
] as const;

/**
 * Evaluate operators
 */
export const EVALUATE_OPERATORS = [
  { value: '==', label: 'Equals (==)' },
  { value: '!=', label: 'Not Equals (!=)' },
  { value: '>', label: 'Greater Than (>)' },
  { value: '<', label: 'Less Than (<)' },
  { value: '>=', label: 'Greater or Equal (>=)' },
  { value: '<=', label: 'Less or Equal (<=)' },
  { value: 'like', label: 'Like (Pattern Match)' },
  { value: 'notlike', label: 'Not Like' },
  { value: 'contains', label: 'Contains' },
  { value: 'notcontains', label: 'Does Not Contain' },
  { value: 'startswith', label: 'Starts With' },
  { value: 'endswith', label: 'Ends With' },
  { value: 'isempty', label: 'Is Empty' },
  { value: 'isnotempty', label: 'Is Not Empty' },
] as const;

/**
 * Operators that don't require a value
 */
export const OPERATORS_WITHOUT_VALUE = ['isempty', 'isnotempty'] as const;

/**
 * Days of the week
 */
export const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Monday', short: 'Mon' },
  { value: 'TUE', label: 'Tuesday', short: 'Tue' },
  { value: 'WED', label: 'Wednesday', short: 'Wed' },
  { value: 'THU', label: 'Thursday', short: 'Thu' },
  { value: 'FRI', label: 'Friday', short: 'Fri' },
  { value: 'SAT', label: 'Saturday', short: 'Sat' },
  { value: 'SUN', label: 'Sunday', short: 'Sun' },
] as const;

/**
 * Common timezones
 */
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Europe/Paris (CET)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin (CET)' },
  { value: 'Europe/Amsterdam', label: 'Europe/Amsterdam (CET)' },
  { value: 'Europe/Madrid', label: 'Europe/Madrid (CET)' },
  { value: 'Europe/Rome', label: 'Europe/Rome (CET)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT)' },
  { value: 'America/Denver', label: 'America/Denver (MST/MDT)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT)' },
  { value: 'America/Toronto', label: 'America/Toronto (EST/EDT)' },
  { value: 'America/Vancouver', label: 'America/Vancouver (PST/PDT)' },
  { value: 'America/Sao_Paulo', label: 'America/Sao_Paulo (BRT)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST)' },
  { value: 'Asia/Shanghai', label: 'Asia/Shanghai (CST)' },
  { value: 'Asia/Hong_Kong', label: 'Asia/Hong_Kong (HKT)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST)' },
  { value: 'Australia/Sydney', label: 'Australia/Sydney (AEST/AEDT)' },
  { value: 'Australia/Melbourne', label: 'Australia/Melbourne (AEST/AEDT)' },
  { value: 'Australia/Perth', label: 'Australia/Perth (AWST)' },
  { value: 'Pacific/Auckland', label: 'Pacific/Auckland (NZST/NZDT)' },
] as const;

/**
 * Country codes with dial codes
 */
export const COUNTRY_CODES = [
  { value: 'US', label: 'United States', dialCode: '+1' },
  { value: 'GB', label: 'United Kingdom', dialCode: '+44' },
  { value: 'CA', label: 'Canada', dialCode: '+1' },
  { value: 'AU', label: 'Australia', dialCode: '+61' },
  { value: 'DE', label: 'Germany', dialCode: '+49' },
  { value: 'FR', label: 'France', dialCode: '+33' },
  { value: 'ES', label: 'Spain', dialCode: '+34' },
  { value: 'IT', label: 'Italy', dialCode: '+39' },
  { value: 'NL', label: 'Netherlands', dialCode: '+31' },
  { value: 'BE', label: 'Belgium', dialCode: '+32' },
  { value: 'CH', label: 'Switzerland', dialCode: '+41' },
  { value: 'AT', label: 'Austria', dialCode: '+43' },
  { value: 'IE', label: 'Ireland', dialCode: '+353' },
  { value: 'PT', label: 'Portugal', dialCode: '+351' },
  { value: 'SE', label: 'Sweden', dialCode: '+46' },
  { value: 'NO', label: 'Norway', dialCode: '+47' },
  { value: 'DK', label: 'Denmark', dialCode: '+45' },
  { value: 'FI', label: 'Finland', dialCode: '+358' },
  { value: 'PL', label: 'Poland', dialCode: '+48' },
  { value: 'CZ', label: 'Czech Republic', dialCode: '+420' },
  { value: 'JP', label: 'Japan', dialCode: '+81' },
  { value: 'CN', label: 'China', dialCode: '+86' },
  { value: 'KR', label: 'South Korea', dialCode: '+82' },
  { value: 'IN', label: 'India', dialCode: '+91' },
  { value: 'SG', label: 'Singapore', dialCode: '+65' },
  { value: 'HK', label: 'Hong Kong', dialCode: '+852' },
  { value: 'NZ', label: 'New Zealand', dialCode: '+64' },
  { value: 'ZA', label: 'South Africa', dialCode: '+27' },
  { value: 'AE', label: 'United Arab Emirates', dialCode: '+971' },
  { value: 'SA', label: 'Saudi Arabia', dialCode: '+966' },
  { value: 'BR', label: 'Brazil', dialCode: '+55' },
  { value: 'MX', label: 'Mexico', dialCode: '+52' },
  { value: 'AR', label: 'Argentina', dialCode: '+54' },
] as const;

// ============================================================================
// CONNECT CALL CONFIGURATION
// ============================================================================

/**
 * Connect types
 */
export const CONNECT_TYPES = [
  { value: 'DDI_USER', label: 'User DDI', description: 'Connect to a user\'s direct dial number' },
  { value: 'ORGANIZATION_NUMBER', label: 'Organization Number', description: 'Connect to an organization number' },
  { value: 'OUTBOUND_CALL', label: 'Outbound Call', description: 'Make an outbound call to external number' },
  { value: 'SIP', label: 'SIP Endpoint', description: 'Connect to a SIP address' },
] as const;

/**
 * Caller ID presentation options
 */
export const CALLER_ID_PRESENTATION_OPTIONS = [
  { value: 'ORIGINAL', label: 'Original Caller ID', description: 'Pass through the original caller ID' },
  { value: 'COMPANY', label: 'Company Number', description: 'Use company caller ID' },
  { value: 'CUSTOM', label: 'Custom Number', description: 'Use a custom number' },
  { value: 'HIDDEN', label: 'Hidden', description: 'Withhold caller ID' },
] as const;

/**
 * Alias for CALLER_ID_PRESENTATION_OPTIONS (for backward compatibility)
 */
export const CALLER_ID_OPTIONS = CALLER_ID_PRESENTATION_OPTIONS;

/**
 * Trigger conditions for actions
 */
export const TRIGGER_WHEN_LIST_CONNECT = [
  { value: 'ALWAYS', label: 'Always' },
  { value: 'ON_ANSWER', label: 'On Answer' },
  { value: 'ON_NO_ANSWER', label: 'On No Answer' },
  { value: 'ON_BUSY', label: 'On Busy' },
  { value: 'ON_FAILURE', label: 'On Failure' },
] as const;

// ============================================================================
// RECORD CALL / RECORD & ANALYSE CONFIGURATION
// ============================================================================

/**
 * Recording channel options
 */
export const CHANNEL_OPTIONS = [
  { value: 'BOTH', label: 'Both Legs' },
  { value: 'A', label: 'Leg A (Caller)' },
  { value: 'B', label: 'Leg B (Callee)' },
] as const;

/**
 * Beep alert options
 */
export const BEEP_OPTIONS = [
  { value: 'OFF', label: 'Off' },
  { value: 'CALLER', label: 'Caller Only' },
  { value: 'CALLED', label: 'Called Party Only' },
  { value: 'BOTH', label: 'Both Parties' },
] as const;

/**
 * Recording start options (for Record & Analyse)
 */
export const RECORDING_START_OPTIONS = [
  { value: 'IMMEDIATE', label: 'Immediately' },
  { value: 'ON_BRIDGE', label: 'On Bridge (When Connected)' },
] as const;

/**
 * Transcription engine options
 */
export const TRANSCRIPTION_ENGINE_OPTIONS = [
  { value: 'VOICEBASE', label: 'VoiceBase' },
  { value: 'DEEPGRAM', label: 'Deepgram' },
] as const;

/**
 * Insight config options
 */
export const INSIGHT_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'BASIC', label: 'Basic Analysis' },
  { value: 'ADVANCED', label: 'Advanced Analysis' },
] as const;

/**
 * VoiceBase language options
 */
export const VOICEBASE_LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
] as const;

/**
 * Deepgram language options
 */
export const DEEPGRAM_LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'it', label: 'Italian' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'nl', label: 'Dutch' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
] as const;

// ============================================================================
// QUERY OBJECT / CREATE RECORD / UPDATE RECORD CONFIGURATION
// ============================================================================

/**
 * Standard Salesforce objects commonly queryable
 */
export const STANDARD_SOBJECTS = [
  { value: 'Account', label: 'Account' },
  { value: 'Contact', label: 'Contact' },
  { value: 'Lead', label: 'Lead' },
  { value: 'Case', label: 'Case' },
  { value: 'Opportunity', label: 'Opportunity' },
  { value: 'Task', label: 'Task' },
  { value: 'Event', label: 'Event' },
  { value: 'User', label: 'User' },
] as const;

/**
 * Alias for STANDARD_SOBJECTS (for backward compatibility)
 */
export const SALESFORCE_OBJECTS = STANDARD_SOBJECTS;

/**
 * Sort direction options
 */
export const SORT_DIRECTIONS = [
  { value: 'ASC', label: 'Ascending' },
  { value: 'DESC', label: 'Descending' },
] as const;

/**
 * Trigger conditions for queries
 */
export const TRIGGER_WHEN_LIST_QUERY = [
  { value: 'ALWAYS', label: 'Always' },
  { value: 'ON_FOUND', label: 'On Record Found' },
  { value: 'ON_NOT_FOUND', label: 'On Record Not Found' },
  { value: 'ON_ERROR', label: 'On Error' },
] as const;

// ============================================================================
// NOTIFY CONFIGURATION
// ============================================================================

/**
 * Notification types
 */
export const NOTIFICATION_TYPES = [
  { value: 'EMAIL', label: 'Email' },
  { value: 'SMS', label: 'SMS' },
  { value: 'CHATTER', label: 'Chatter Post' },
] as const;

// ============================================================================
// SWITCHBOARD / SWITCH ITEM / GET INFO CONFIGURATION
// ============================================================================

/**
 * DTMF tone options
 */
export const DTMF_TONE_OPTIONS = [
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '4', label: '4' },
  { value: '5', label: '5' },
  { value: '6', label: '6' },
  { value: '7', label: '7' },
  { value: '8', label: '8' },
  { value: '9', label: '9' },
  { value: '0', label: '0' },
  { value: '*', label: '*' },
  { value: '#', label: '#' },
] as const;

/**
 * Pattern assign to options (where to store matched value)
 */
export const PATTERN_ASSIGN_TO_OPTIONS = [
  { value: 'NONE', label: 'None (Don\'t Store)' },
  { value: 'CALLER_ID_NAME', label: 'Caller ID Name' },
  { value: 'CUSTOM_PROPERTY', label: 'Custom Property' },
] as const;

/**
 * Pattern assign type options (for Get Info)
 */
export const PATTERN_ASSIGN_TYPE_OPTIONS = [
  { value: 'VALUE', label: 'Store Value' },
  { value: 'MACRO', label: 'Store as Macro Variable' },
] as const;

// ============================================================================
// AI AGENT CONFIGURATION
// ============================================================================

/**
 * AI model options (placeholder - actual models fetched from API)
 */
export const AI_MODEL_OPTIONS = [
  { value: 'gpt-4', label: 'GPT-4' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
] as const;

// ============================================================================
// REQUEST SKILLS CONFIGURATION
// ============================================================================

/**
 * Default skill proficiency range
 */
export const SKILL_PROFICIENCY_MIN = 1;
export const SKILL_PROFICIENCY_MAX = 10;
export const SKILL_PROFICIENCY_DEFAULT = 5;

// ============================================================================
// VOICEMAIL CONFIGURATION
// ============================================================================

/**
 * Voicemail greeting types
 */
export const VOICEMAIL_GREETING_TYPES = [
  { value: 'DEFAULT', label: 'Default Greeting' },
  { value: 'CUSTOM', label: 'Custom Greeting' },
  { value: 'NONE', label: 'No Greeting' },
] as const;

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_CONFIG = {
  speak: {
    voice: DEFAULT_VOICE,
    sayPhrase: '',
  },
  callQueue: {
    queueAlgorithm: 'ROUND_ROBIN',
    holdMusicType: 'AUTO',
    holdMusic: '',
    exitKey: '',
    wrapUpType: 'NONE',
    ringTargets: [],
    announcements: [],
    screen: false,
    callback: {
      enabled: false,
      activationKey: '#',
      maxAttempts: 3,
    },
  },
  huntGroup: {
    strategy: 'SEQUENTIAL',
    ringDuration: 20,
    connectTargets: [],
    transferAfterConnect: false,
    hangupAfterBridge: false,
  },
  rule: {
    rules: {
      timeOfDay: [],
      countryCode: [],
      callerIdWithheld: [],
      numberMatch: [],
      evaluate: [],
    },
  },
  connectCall: {
    connectType: 'DDI_USER',
    connectValue: '',
    callerIdPresentation: 'ORIGINAL',
    transferAfterConnect: false,
    hangupAfterBridge: false,
    ringDuration: 30,
  },
  queryObject: {
    sObject: '',
    filterFields: [],
    selectedFields: [],
    orderBy: { field: '', direction: 'ASC' },
    resultSize: 1,
    trigger: 'ALWAYS',
    showAPIName: false,
    soql: '',
  },
  createRecord: {
    sObject: '',
    fields: [],
    ownerId: '',
    resultSet: '',
    trigger: 'ALWAYS',
    showAPIName: false,
  },
  recordCall: {
    retain: false,
    archivePolicyId: '',
    channel: 'BOTH',
    startOnBridge: false,
    allowPause: false,
    beep: 'OFF',
    emailSend: false,
  },
  recordAndAnalyse: {
    retain: false,
    archivingPolicyId: '',
    channel: 'BOTH',
    startRecording: 'ON_BRIDGE',
    beepAlert: 'OFF',
    stopAllowed: false,
    pauseAllowed: false,
    insightConfig: 'NONE',
    transcriptionEngine: 'DEEPGRAM',
    analysisLanguage: 'en',
    disableSummarization: false,
  },
  notify: {
    type: 'EMAIL',
    to: '',
    cc: '',
    subject: '',
    body: '',
    attachRecording: false,
  },
  switchItem: {
    tone: '1',
    itemPhrase: '',
    pattern: '',
    patternAssignTo: 'NONE',
    selectedPhrase: '',
    callerIdName: '',
  },
  getInfo: {
    tone: '',
    itemPhrase: '',
    pattern: '',
    patternAssignTo: 'NONE',
    patternAssignType: 'VALUE',
    patternAssignMacro: '',
    selectedPhrase: '',
    callerIdName: '',
  },
  voicemail: {
    targetType: 'USER',
    targetId: '',
    greetingType: 'DEFAULT',
    customGreeting: '',
    maxDuration: 120,
  },
  requestSkills: {
    deleteSkills: false,
    skills: [],
  },
  aiAgent: {
    agentId: '',
    agentVersion: '',
    tokens: [],
    instanceName: '',
  },
  debug: {
    message: '',
  },
} as const;

// ============================================================================
// HUNT GROUP CONFIGURATION
// ============================================================================

export const HUNT_GROUP_DEFAULTS = {
  trigger: ['ANSWERED'],
  connectType: 'user',
  connectValue: '',
  targets: [] as Array<{ type: string; value: string }>,
  ringDuration: 30,
  callerIdPresentation: 'CALLER',
  customCallerId: '',
  transferAfterConnect: false,
  hangupAfterBridge: true,
  screen: false,
  screenAnnouncement: '',
  screenAcceptKey: '1',
  camp: {
    enabled: false,
    chimeFormat: 'BEEP',
    ringDuration: 30,
  },
};

// ============================================================================
// CREATE RECORD CONFIGURATION
// ============================================================================

export const CREATE_RECORD_DEFAULTS = {
  trigger: ['ANSWERED'],
  objectType: 'Task',
  recordTypeId: '',
  fields: [] as Array<{ field: string; value: string; type: string }>,
  outputVariable: 'newRecordId',
  setOwner: false,
  ownerId: '',
};

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Validates an email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number (E.164 format)
 */
export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
}

/**
 * Validates a regex pattern
 */
export function isValidRegex(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates time format (HH:MM)
 */
export function isValidTime(time: string): boolean {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
}

/**
 * Validates SOQL query (basic validation)
 */
export function isValidSOQL(soql: string): boolean {
  const soqlUpper = soql.toUpperCase().trim();
  return soqlUpper.startsWith('SELECT') && soqlUpper.includes('FROM');
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type VoiceOption = typeof SPEAK_VOICE_LIST[number];
export type QueueAlgorithmType = typeof QUEUE_ALGORITHM_TYPES[number]['value'];
export type HoldMusicType = typeof HOLD_MUSIC_TYPES[number]['value'];
export type RuleType = typeof RULE_TYPES[number]['value'];
export type ConnectType = typeof CONNECT_TYPES[number]['value'];
export type ChannelOption = typeof CHANNEL_OPTIONS[number]['value'];
export type BeepOption = typeof BEEP_OPTIONS[number]['value'];
export type NotificationType = typeof NOTIFICATION_TYPES[number]['value'];
export type DTMFTone = typeof DTMF_TONE_OPTIONS[number]['value'];

export interface TimeOfDayRule {
  startTime: string;
  endTime: string;
  timeBetween: boolean;
  startDate: string;
  endDate: string;
  dateBetween: boolean;
  days: string[];
  timeZone: string;
}

export interface CountryCodeRule {
  numberType: string;
  matches: string;
  countryCode: string;
}

export interface NumberMatchRule {
  numberType: string;
  matches: string;
  number: string;
}

export interface EvaluateRule {
  lhs: string;
  operator: string;
  rhs: string;
}

export interface RuleConfig {
  timeOfDay: TimeOfDayRule[][];
  countryCode: CountryCodeRule[][];
  callerIdWithheld: boolean[][];
  numberMatch: NumberMatchRule[][];
  evaluate: EvaluateRule[][];
}

export interface SkillConfig {
  skillId: string;
  skillName: string;
  proficiency: number;
}

