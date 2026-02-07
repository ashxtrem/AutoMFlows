"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DynamicDataGenerator = void 0;
const faker_1 = require("@faker-js/faker");
/**
 * Dynamic Data Generator Utility
 * Maps Postman-style dynamic variable names to Faker.js methods
 * Supports: ${dynamic.<key>} syntax
 */
class DynamicDataGenerator {
    /**
     * Generate a dynamic value based on the key
     * @param key - The dynamic variable key (e.g., "randomEmail", "guid", "timestamp")
     * @returns Generated value as string
     */
    static generate(key) {
        try {
            const normalizedKey = key.toLowerCase().trim();
            // Map Postman-style dynamic variables to Faker.js methods
            const value = this.generateValue(normalizedKey);
            if (value === undefined) {
                // Return original key if not found (will be handled by VariableInterpolator)
                throw new Error(`Unknown dynamic key: ${key}`);
            }
            return String(value);
        }
        catch (error) {
            // Log warning but don't throw - let VariableInterpolator handle it
            console.warn(`[DynamicDataGenerator] Failed to generate value for "${key}": ${error.message}`);
            throw error;
        }
    }
    /**
     * Generate value based on normalized key
     */
    static generateValue(key) {
        // Common / UUID / Timestamp
        if (key === 'guid' || key === 'randomuuid') {
            return faker_1.faker.string.uuid();
        }
        if (key === 'timestamp') {
            return Math.floor(Date.now() / 1000);
        }
        if (key === 'isotimestamp') {
            return new Date().toISOString();
        }
        // Text & Numbers
        if (key === 'randomalphanumeric') {
            return faker_1.faker.string.alphanumeric({ length: { min: 10, max: 20 } });
        }
        if (key === 'randomboolean') {
            return faker_1.faker.datatype.boolean();
        }
        if (key === 'randomint') {
            return faker_1.faker.number.int({ min: 0, max: 1000 });
        }
        if (key === 'randomcolor') {
            return faker_1.faker.color.human();
        }
        if (key === 'randomhexcolor') {
            return faker_1.faker.color.rgb();
        }
        if (key === 'randomabbreviation') {
            return faker_1.faker.string.alpha({ length: 3, casing: 'upper' });
        }
        // Names
        if (key === 'randomfirstname') {
            return faker_1.faker.person.firstName();
        }
        if (key === 'randomlastname') {
            return faker_1.faker.person.lastName();
        }
        if (key === 'randomfullname') {
            return faker_1.faker.person.fullName();
        }
        if (key === 'randomnameprefix') {
            return faker_1.faker.person.prefix();
        }
        if (key === 'randomnamesuffix') {
            return faker_1.faker.person.suffix();
        }
        // Internet
        if (key === 'randomip') {
            return faker_1.faker.internet.ip();
        }
        if (key === 'randomipv6') {
            return faker_1.faker.internet.ipv6();
        }
        if (key === 'randommacaddress') {
            return faker_1.faker.internet.mac();
        }
        if (key === 'randomemail') {
            return faker_1.faker.internet.email();
        }
        if (key === 'randompassword') {
            return faker_1.faker.internet.password({ length: 12 });
        }
        if (key === 'randomusername') {
            return faker_1.faker.internet.username();
        }
        if (key === 'randomuseragent') {
            return faker_1.faker.internet.userAgent();
        }
        if (key === 'randomprotocol') {
            return faker_1.faker.internet.protocol();
        }
        if (key === 'randomurl') {
            return faker_1.faker.internet.url();
        }
        if (key === 'randomdomain') {
            return faker_1.faker.internet.domainName();
        }
        // Locations & Addresses
        if (key === 'randomcity') {
            return faker_1.faker.location.city();
        }
        if (key === 'randomcountry') {
            return faker_1.faker.location.country();
        }
        if (key === 'randomcountrycode') {
            return faker_1.faker.location.countryCode();
        }
        if (key === 'randomlatitude') {
            return faker_1.faker.location.latitude();
        }
        if (key === 'randomlongitude') {
            return faker_1.faker.location.longitude();
        }
        if (key === 'randomstreetname') {
            return faker_1.faker.location.street();
        }
        if (key === 'randomstreetaddress') {
            return faker_1.faker.location.streetAddress();
        }
        if (key === 'randomphonenumber') {
            return faker_1.faker.phone.number();
        }
        if (key === 'randomzipcode' || key === 'randompostcode') {
            return faker_1.faker.location.zipCode();
        }
        if (key === 'randomstate') {
            return faker_1.faker.location.state();
        }
        if (key === 'randomstateabbr') {
            return faker_1.faker.location.state({ abbreviated: true });
        }
        // Business
        if (key === 'randomcompanyname') {
            return faker_1.faker.company.name();
        }
        if (key === 'randomjobtitle') {
            return faker_1.faker.person.jobTitle();
        }
        if (key === 'randomdepartment') {
            return faker_1.faker.commerce.department();
        }
        if (key === 'randomproductname') {
            return faker_1.faker.commerce.productName();
        }
        if (key === 'randomproduct') {
            return faker_1.faker.commerce.product();
        }
        if (key === 'randomproductadjective') {
            return faker_1.faker.commerce.productAdjective();
        }
        if (key === 'randomproductmaterial') {
            return faker_1.faker.commerce.productMaterial();
        }
        if (key === 'randomcatchphrase') {
            return faker_1.faker.company.catchPhrase();
        }
        if (key === 'randombs') {
            return faker_1.faker.company.buzzPhrase();
        }
        // Finance
        if (key === 'randombankaccount') {
            return faker_1.faker.finance.accountNumber();
        }
        if (key === 'randombankaccountname') {
            return faker_1.faker.finance.accountName();
        }
        if (key === 'randomcreditcardnumber') {
            return faker_1.faker.finance.creditCardNumber();
        }
        if (key === 'randomcurrency') {
            return faker_1.faker.finance.currency().name;
        }
        if (key === 'randomcurrencycode') {
            return faker_1.faker.finance.currencyCode();
        }
        if (key === 'randomamount') {
            return faker_1.faker.finance.amount();
        }
        if (key === 'randombitcoinaddress') {
            return faker_1.faker.finance.bitcoinAddress();
        }
        // Dates
        if (key === 'randomdatepast') {
            return faker_1.faker.date.past().toISOString();
        }
        if (key === 'randomdatefuture') {
            return faker_1.faker.date.future().toISOString();
        }
        if (key === 'randomdaterecent') {
            return faker_1.faker.date.recent().toISOString();
        }
        if (key === 'randommonth') {
            return faker_1.faker.date.month();
        }
        if (key === 'randomweekday') {
            return faker_1.faker.date.weekday();
        }
        if (key === 'randomyear') {
            return faker_1.faker.date.past({ years: 10 }).getFullYear();
        }
        // Database
        if (key === 'randomdatabasecolumn') {
            return faker_1.faker.database.column();
        }
        if (key === 'randomdatabasetype') {
            return faker_1.faker.database.type();
        }
        if (key === 'randomdatabaseengine') {
            return faker_1.faker.database.engine();
        }
        if (key === 'randomdatabasecollation') {
            return faker_1.faker.database.collation();
        }
        // Text Content
        if (key === 'randomword') {
            return faker_1.faker.word.sample();
        }
        if (key === 'randomwords') {
            return faker_1.faker.word.words({ count: { min: 3, max: 7 } });
        }
        if (key === 'randomsentence') {
            return faker_1.faker.lorem.sentence();
        }
        if (key === 'randomparagraph') {
            return faker_1.faker.lorem.paragraph();
        }
        if (key === 'randomtext') {
            return faker_1.faker.lorem.text();
        }
        // Additional useful generators
        if (key === 'randomimageurl') {
            return faker_1.faker.image.url();
        }
        if (key === 'randomavatar') {
            return faker_1.faker.image.avatar();
        }
        if (key === 'randomnumber') {
            return faker_1.faker.number.int();
        }
        if (key === 'randomfloat') {
            return faker_1.faker.number.float();
        }
        if (key === 'randomalpha') {
            return faker_1.faker.string.alpha({ length: { min: 5, max: 10 } });
        }
        if (key === 'randomnumeric') {
            return faker_1.faker.string.numeric({ length: { min: 5, max: 10 } });
        }
        return undefined;
    }
}
exports.DynamicDataGenerator = DynamicDataGenerator;
