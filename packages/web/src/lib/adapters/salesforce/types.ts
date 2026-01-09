/**
 * Salesforce-specific types
 * 
 * These types mirror Salesforce sObject structures.
 * All Salesforce field knowledge is contained in this file and the mappers.
 */

// =============================================================================
// Salesforce User Types
// =============================================================================

/**
 * Salesforce User__c record structure
 */
export interface SalesforceUserRecord {
  Id: string;
  Name: string;
  nbavs__Id__c?: number;
  nbavs__FirstName__c?: string;
  nbavs__LastName__c?: string;
  nbavs__Username__c?: string;
  nbavs__SipExtension__c?: string;
  nbavs__MobilePhone__c?: string;
  nbavs__Status__c?: string;
  nbavs__Enabled__c?: boolean;
  nbavs__CTI__c?: boolean;
  nbavs__PBX__c?: boolean;
  nbavs__Manager__c?: boolean;
  nbavs__Record__c?: boolean;
  nbavs__PCI__c?: boolean;
  nbavs__SCV__c?: boolean;
  nbavs__SMS__c?: boolean;
  nbavs__WhatsApp__c?: boolean;
  nbavs__Insights__c?: boolean;
  nbavs__Freedom__c?: boolean;
  nbavs__PermissionLevel__c?: string;
  nbavs__TrackOutboundCTIDevice__c?: boolean;
  nbavs__AvailabilityProfile__c?: string;
  nbavs__AvailabilityProfile__r?: {
    Id: string;
    Name: string;
  };
  nbavs__AvailabilityProfileState__r?: {
    Name: string;
    nbavs__DisplayName__c?: string;
  };
  nbavs__User__c?: string;
  nbavs__User__r?: {
    Id: string;
    Name: string;
    Email: string;
  };
}

/**
 * Data for creating/updating a Salesforce User__c
 */
export interface SalesforceUserData {
  [key: string]: unknown;
}

// =============================================================================
// Salesforce Group Types
// =============================================================================

/**
 * Salesforce Group__c record structure
 */
export interface SalesforceGroupRecord {
  Id: string;
  Name: string;
  nbavs__Id__c?: number;
  nbavs__Description__c?: string;
  nbavs__Email__c?: string;
  nbavs__Extension__c?: string;
  nbavs__GroupPickup__c?: string;
  nbavs__PBX__c?: boolean;
  nbavs__Manager__c?: boolean;
  nbavs__Record__c?: boolean;
  LastModifiedDate?: string;
}

/**
 * Salesforce GroupMember__c record structure
 */
export interface SalesforceGroupMemberRecord {
  Id: string;
  nbavs__Group__c: string;
  nbavs__Group__r?: {
    Id: string;
    Name: string;
  };
  nbavs__User__c: string;
  nbavs__User__r?: {
    Id: string;
    Name: string;
  };
  nbavs__RingOrder__c?: number;
}

// =============================================================================
// Salesforce Device Types
// =============================================================================

/**
 * Salesforce Device__c record structure
 */
export interface SalesforceDeviceRecord {
  Id: string;
  Name: string;
  nbavs__Id__c?: number;
  nbavs__Extension__c?: string;
  nbavs__Location__c?: string;
  nbavs__Description__c?: string;
  nbavs__Type__c?: string;
  nbavs__Model__c?: string;
  nbavs__MAC__c?: string;
  nbavs__Enabled__c?: boolean;
  nbavs__Registered__c?: boolean;
  nbavs__RegistrationExpiry__c?: string;
  LastModifiedDate?: string;
  nbavs__DeviceMappings__r?: {
    records: SalesforceDeviceMappingRecord[];
  };
}

/**
 * Salesforce DeviceMapping__c record structure
 */
export interface SalesforceDeviceMappingRecord {
  Id: string;
  nbavs__Device__c?: string;
  nbavs__User__c: string;
  nbavs__User__r?: {
    Id: string;
    Name: string;
  };
}

// =============================================================================
// Salesforce Phone Number Types
// =============================================================================

/**
 * Salesforce PhoneNumber__c record structure
 * Fields verified from original working implementation
 */
export interface SalesforcePhoneNumberRecord {
  Id: string;
  Name: string;
  nbavs__Number__c?: string;
  nbavs__Country__c?: string;
  nbavs__CountryCode__c?: string;
  nbavs__AreaCode__c?: string;
  nbavs__Area__c?: string;
  nbavs__LocalNumber__c?: string;
  nbavs__DDI_Number__c?: boolean;
  nbavs__Geographic__c?: boolean;
  nbavs__Capability_SMS__c?: boolean;
  nbavs__Capability_MMS__c?: boolean;
  nbavs__Capability_Voice__c?: boolean;
  nbavs__Local_Presence_Enabled__c?: boolean;
  LastModifiedDate?: string;
  nbavs__CallFlow__c?: string;
  nbavs__CallFlow__r?: {
    Id: string;
    Name: string;
  };
  nbavs__User__c?: string;
  nbavs__User__r?: {
    Id: string;
    Name: string;
  };
}

// =============================================================================
// Salesforce CallFlow Types
// =============================================================================

/**
 * Salesforce CallFlow__c record structure (Routing Policy)
 */
export interface SalesforceCallFlowRecord {
  Id: string;
  Name: string;
  nbavs__Id__c?: number;
  nbavs__Source__c?: string;
  nbavs__Type__c?: string;
  nbavs__Status__c?: string;
  nbavs__Description__c?: string;
  nbavs__Body__c?: string;
  nbavs__Policy__c?: string;
  CreatedById: string;
  CreatedBy?: {
    Id: string;
    Name: string;
  };
  CreatedDate: string;
  LastModifiedById: string;
  LastModifiedBy?: {
    Id: string;
    Name: string;
  };
  LastModifiedDate: string;
}

// =============================================================================
// Salesforce Call Log Types
// =============================================================================

/**
 * Salesforce CallLog__c record structure
 */
export interface SalesforceCallLogRecord {
  Id: string;
  nbavs__DateTime__c: string;
  nbavs__FromNumber__c?: string;
  nbavs__ToNumber__c?: string;
  nbavs__Direction__c?: string;
  nbavs__TimeTalking__c?: number;
  nbavs__TimeRinging__c?: number;
  nbavs__TimeHunting__c?: number;
  nbavs__Recorded_A__c?: boolean;
  nbavs__Recorded_B__c?: boolean;
  nbavs__aUUId__c?: string;
  nbavs__bUUId__c?: string;
  nbavs__FromUser__c?: string;
  nbavs__FromUser__r?: {
    Id: string;
    Name: string;
  };
  nbavs__ToUser__c?: string;
  nbavs__ToUser__r?: {
    Id: string;
    Name: string;
  };
}

// =============================================================================
// Salesforce System User (for linking)
// =============================================================================

/**
 * Standard Salesforce User record
 */
export interface SalesforceSystemUserRecord {
  Id: string;
  Name: string;
  Email: string;
  IsActive?: boolean;
}

// =============================================================================
// Salesforce AvailabilityProfile Types
// =============================================================================

/**
 * Salesforce AvailabilityProfile__c record structure
 */
export interface SalesforceAvailabilityProfileRecord {
  Id: string;
  Name: string;
  nbavs__Id__c?: number;
  CreatedBy?: {
    Name: string;
  };
}
