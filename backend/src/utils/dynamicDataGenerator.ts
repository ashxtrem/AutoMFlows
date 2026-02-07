import { faker } from '@faker-js/faker';

/**
 * Dynamic Data Generator Utility
 * Maps Postman-style dynamic variable names to Faker.js methods
 * Supports: ${dynamic.<key>} syntax
 */
export class DynamicDataGenerator {
  /**
   * Generate a dynamic value based on the key
   * @param key - The dynamic variable key (e.g., "randomEmail", "guid", "timestamp")
   * @returns Generated value as string
   */
  static generate(key: string): string {
    try {
      const normalizedKey = key.toLowerCase().trim();
      
      // Map Postman-style dynamic variables to Faker.js methods
      const value = this.generateValue(normalizedKey);
      
      if (value === undefined) {
        // Return original key if not found (will be handled by VariableInterpolator)
        throw new Error(`Unknown dynamic key: ${key}`);
      }
      
      return String(value);
    } catch (error: any) {
      // Log warning but don't throw - let VariableInterpolator handle it
      console.warn(`[DynamicDataGenerator] Failed to generate value for "${key}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate value based on normalized key
   */
  private static generateValue(key: string): any {
    // Common / UUID / Timestamp
    if (key === 'guid' || key === 'randomuuid') {
      return faker.string.uuid();
    }
    if (key === 'timestamp') {
      return Math.floor(Date.now() / 1000);
    }
    if (key === 'isotimestamp') {
      return new Date().toISOString();
    }

    // Text & Numbers
    if (key === 'randomalphanumeric') {
      return faker.string.alphanumeric({ length: { min: 10, max: 20 } });
    }
    if (key === 'randomboolean') {
      return faker.datatype.boolean();
    }
    if (key === 'randomint') {
      return faker.number.int({ min: 0, max: 1000 });
    }
    if (key === 'randomcolor') {
      return faker.color.human();
    }
    if (key === 'randomhexcolor') {
      return faker.color.rgb();
    }
    if (key === 'randomabbreviation') {
      return faker.string.alpha({ length: 3, casing: 'upper' });
    }

    // Names
    if (key === 'randomfirstname') {
      return faker.person.firstName();
    }
    if (key === 'randomlastname') {
      return faker.person.lastName();
    }
    if (key === 'randomfullname') {
      return faker.person.fullName();
    }
    if (key === 'randomnameprefix') {
      return faker.person.prefix();
    }
    if (key === 'randomnamesuffix') {
      return faker.person.suffix();
    }

    // Internet
    if (key === 'randomip') {
      return faker.internet.ip();
    }
    if (key === 'randomipv6') {
      return faker.internet.ipv6();
    }
    if (key === 'randommacaddress') {
      return faker.internet.mac();
    }
    if (key === 'randomemail') {
      return faker.internet.email();
    }
    if (key === 'randompassword') {
      return faker.internet.password({ length: 12 });
    }
    if (key === 'randomusername') {
      return faker.internet.username();
    }
    if (key === 'randomuseragent') {
      return faker.internet.userAgent();
    }
    if (key === 'randomprotocol') {
      return faker.internet.protocol();
    }
    if (key === 'randomurl') {
      return faker.internet.url();
    }
    if (key === 'randomdomain') {
      return faker.internet.domainName();
    }

    // Locations & Addresses
    if (key === 'randomcity') {
      return faker.location.city();
    }
    if (key === 'randomcountry') {
      return faker.location.country();
    }
    if (key === 'randomcountrycode') {
      return faker.location.countryCode();
    }
    if (key === 'randomlatitude') {
      return faker.location.latitude();
    }
    if (key === 'randomlongitude') {
      return faker.location.longitude();
    }
    if (key === 'randomstreetname') {
      return faker.location.street();
    }
    if (key === 'randomstreetaddress') {
      return faker.location.streetAddress();
    }
    if (key === 'randomphonenumber') {
      return faker.phone.number();
    }
    if (key === 'randomzipcode' || key === 'randompostcode') {
      return faker.location.zipCode();
    }
    if (key === 'randomstate') {
      return faker.location.state();
    }
    if (key === 'randomstateabbr') {
      return faker.location.state({ abbreviated: true });
    }

    // Business
    if (key === 'randomcompanyname') {
      return faker.company.name();
    }
    if (key === 'randomjobtitle') {
      return faker.person.jobTitle();
    }
    if (key === 'randomdepartment') {
      return faker.commerce.department();
    }
    if (key === 'randomproductname') {
      return faker.commerce.productName();
    }
    if (key === 'randomproduct') {
      return faker.commerce.product();
    }
    if (key === 'randomproductadjective') {
      return faker.commerce.productAdjective();
    }
    if (key === 'randomproductmaterial') {
      return faker.commerce.productMaterial();
    }
    if (key === 'randomcompanyname') {
      return faker.company.name();
    }
    if (key === 'randomcatchphrase') {
      return faker.company.catchPhrase();
    }
    if (key === 'randombs') {
      return faker.company.buzzPhrase();
    }

    // Finance
    if (key === 'randombankaccount') {
      return faker.finance.accountNumber();
    }
    if (key === 'randombankaccountname') {
      return faker.finance.accountName();
    }
    if (key === 'randomcreditcardnumber') {
      return faker.finance.creditCardNumber();
    }
    if (key === 'randomcurrency') {
      return faker.finance.currency().name;
    }
    if (key === 'randomcurrencycode') {
      return faker.finance.currencyCode();
    }
    if (key === 'randomamount') {
      return faker.finance.amount();
    }
    if (key === 'randombitcoinaddress') {
      return faker.finance.bitcoinAddress();
    }

    // Dates
    if (key === 'randomdatepast') {
      return faker.date.past().toISOString();
    }
    if (key === 'randomdatefuture') {
      return faker.date.future().toISOString();
    }
    if (key === 'randomdaterecent') {
      return faker.date.recent().toISOString();
    }
    if (key === 'randommonth') {
      return faker.date.month();
    }
    if (key === 'randomweekday') {
      return faker.date.weekday();
    }
    if (key === 'randomyear') {
      return faker.date.past({ years: 10 }).getFullYear();
    }

    // Database
    if (key === 'randomdatabasecolumn') {
      return faker.database.column();
    }
    if (key === 'randomdatabasetype') {
      return faker.database.type();
    }
    if (key === 'randomdatabaseengine') {
      return faker.database.engine();
    }
    if (key === 'randomdatabasecollation') {
      return faker.database.collation();
    }

    // Text Content
    if (key === 'randomword') {
      return faker.word.sample();
    }
    if (key === 'randomwords') {
      return faker.word.words({ count: { min: 3, max: 7 } });
    }
    if (key === 'randomsentence') {
      return faker.lorem.sentence();
    }
    if (key === 'randomparagraph') {
      return faker.lorem.paragraph();
    }
    if (key === 'randomtext') {
      return faker.lorem.text();
    }

    // Additional useful generators
    if (key === 'randomimageurl') {
      return faker.image.url();
    }
    if (key === 'randomavatar') {
      return faker.image.avatar();
    }
    if (key === 'randomnumber') {
      return faker.number.int();
    }
    if (key === 'randomfloat') {
      return faker.number.float();
    }
    if (key === 'randomalpha') {
      return faker.string.alpha({ length: { min: 5, max: 10 } });
    }
    if (key === 'randomnumeric') {
      return faker.string.numeric({ length: { min: 5, max: 10 } });
    }

    return undefined;
  }

  /**
   * Check if a key is a valid dynamic variable
   */
  static isValidKey(key: string): boolean {
    try {
      this.generateValue(key.toLowerCase().trim());
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get list of all supported dynamic variable keys
   */
  static getSupportedKeys(): string[] {
    return [
      // Common
      'guid', 'randomUUID', 'timestamp', 'isoTimestamp',
      // Text & Numbers
      'randomAlphaNumeric', 'randomBoolean', 'randomInt', 'randomColor', 'randomHexColor', 'randomAbbreviation',
      // Names
      'randomFirstName', 'randomLastName', 'randomFullName', 'randomNamePrefix', 'randomNameSuffix',
      // Internet
      'randomIP', 'randomIPV6', 'randomMACAddress', 'randomEmail', 'randomPassword', 'randomUsername',
      'randomUserAgent', 'randomProtocol', 'randomUrl', 'randomDomain',
      // Locations
      'randomCity', 'randomCountry', 'randomCountryCode', 'randomLatitude', 'randomLongitude',
      'randomStreetName', 'randomStreetAddress', 'randomPhoneNumber', 'randomZipCode', 'randomState', 'randomStateAbbr',
      // Business
      'randomCompanyName', 'randomJobTitle', 'randomDepartment', 'randomProductName', 'randomProduct',
      'randomProductAdjective', 'randomProductMaterial', 'randomCatchPhrase', 'randomBs',
      // Finance
      'randomBankAccount', 'randomBankAccountName', 'randomCreditCardNumber', 'randomCurrency', 'randomCurrencyCode',
      'randomAmount', 'randomBitcoinAddress',
      // Dates
      'randomDatePast', 'randomDateFuture', 'randomDateRecent', 'randomMonth', 'randomWeekday', 'randomYear',
      // Database
      'randomDatabaseColumn', 'randomDatabaseType', 'randomDatabaseEngine', 'randomDatabaseCollation',
      // Text
      'randomWord', 'randomWords', 'randomSentence', 'randomParagraph', 'randomText',
      // Additional
      'randomImageUrl', 'randomAvatar', 'randomNumber', 'randomFloat', 'randomAlpha', 'randomNumeric',
    ];
  }
}
