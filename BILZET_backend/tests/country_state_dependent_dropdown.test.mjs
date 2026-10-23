import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCountries,
  getStatesForCountry,
  isValidStateForCountry,
  findCountry,
  getCountryPhoneCode,
  getDefaultStateForCountry,
} from '../src/utils/countryStateData.mjs';
import * as customerController from '../src/controllers/customer.controller.mjs';

test('BILZET — Country-State Dependent Dropdown & Synchronization Engine', async (t) => {

  await t.test('1. Data Provider: Comprehensive Country & Dependent States Verification', () => {
    const countries = getCountries();
    assert.ok(countries.length >= 7, 'Should support at least 7 countries including IN, US, SG, AE, GB, CA, AU');

    // 1.1 India states check
    const inStates = getStatesForCountry('India');
    assert.ok(inStates.length >= 36, 'India must have 36 states & union territories');
    assert.ok(inStates.includes('Tamil Nadu'), 'India must contain Tamil Nadu');
    assert.ok(inStates.includes('Karnataka'), 'India must contain Karnataka');
    assert.ok(inStates.includes('Maharashtra'), 'India must contain Maharashtra');
    assert.ok(inStates.includes('Delhi'), 'India must contain Delhi');

    // 1.2 USA states check
    const usStates = getStatesForCountry('United States');
    assert.ok(usStates.length >= 50, 'USA must have at least 50 states');
    assert.ok(usStates.includes('California'), 'USA must contain California');
    assert.ok(usStates.includes('New York'), 'USA must contain New York');
    assert.ok(usStates.includes('Texas'), 'USA must contain Texas');
    assert.equal(inStates.includes('California'), false, 'India must not contain California');
    assert.equal(usStates.includes('Tamil Nadu'), false, 'USA must not contain Tamil Nadu');

    // 1.3 Singapore regions check
    const sgRegions = getStatesForCountry('Singapore');
    assert.ok(sgRegions.length >= 5, 'Singapore must have 5 Community Development Council regions');
    assert.ok(sgRegions.includes('Central Singapore'), 'Singapore must contain Central Singapore');
    assert.ok(sgRegions.includes('North East'), 'Singapore must contain North East');
    assert.ok(sgRegions.includes('North West'), 'Singapore must contain North West');
    assert.ok(sgRegions.includes('South East'), 'Singapore must contain South East');
    assert.ok(sgRegions.includes('South West'), 'Singapore must contain South West');
    assert.equal(sgRegions.includes('Tamil Nadu'), false, 'Singapore must not contain Tamil Nadu');
    assert.equal(sgRegions.includes('California'), false, 'Singapore must not contain California');

    // 1.4 UAE Emirates check
    const uaeEmirates = getStatesForCountry('United Arab Emirates');
    assert.equal(uaeEmirates.length, 7, 'UAE must have 7 Emirates');
    assert.ok(uaeEmirates.includes('Dubai'));
    assert.ok(uaeEmirates.includes('Abu Dhabi'));

    // 1.5 UK regions check
    const ukRegions = getStatesForCountry('United Kingdom');
    assert.ok(ukRegions.includes('England'));
    assert.ok(ukRegions.includes('Scotland'));
  });

  await t.test('2. Country Aliases and Phone Code Resolution', () => {
    assert.equal(findCountry('USA')?.name, 'United States');
    assert.equal(findCountry('US')?.name, 'United States');
    assert.equal(findCountry('UAE')?.name, 'United Arab Emirates');
    assert.equal(findCountry('UK')?.name, 'United Kingdom');
    assert.equal(findCountry('SG')?.name, 'Singapore');
    assert.equal(findCountry('IN')?.name, 'India');

    assert.equal(getCountryPhoneCode('India'), '+91');
    assert.equal(getCountryPhoneCode('United States'), '+1');
    assert.equal(getCountryPhoneCode('Singapore'), '+65');
    assert.equal(getCountryPhoneCode('United Arab Emirates'), '+971');
    assert.equal(getCountryPhoneCode('United Kingdom'), '+44');
  });

  await t.test('3. Cross-Country State Membership Validation (isValidStateForCountry)', () => {
    // India
    assert.equal(isValidStateForCountry('India', 'Tamil Nadu'), true);
    assert.equal(isValidStateForCountry('India', 'tamil nadu'), true); // case-insensitive
    assert.equal(isValidStateForCountry('India', 'California'), false);
    assert.equal(isValidStateForCountry('India', 'Central Singapore'), false);

    // USA
    assert.equal(isValidStateForCountry('United States', 'California'), true);
    assert.equal(isValidStateForCountry('USA', 'New York'), true);
    assert.equal(isValidStateForCountry('United States', 'Tamil Nadu'), false);
    assert.equal(isValidStateForCountry('USA', 'Dubai'), false);

    // Singapore
    assert.equal(isValidStateForCountry('Singapore', 'Central Singapore'), true);
    assert.equal(isValidStateForCountry('Singapore', 'Tamil Nadu'), false);
    assert.equal(isValidStateForCountry('Singapore', 'California'), false);

    // UAE
    assert.equal(isValidStateForCountry('United Arab Emirates', 'Dubai'), true);
    assert.equal(isValidStateForCountry('UAE', 'Tamil Nadu'), false);
  });

  await t.test('4. Form State Transition Lifecycle & Stale Value Clearing Simulation', () => {
    // Simulated state machine that mimics the React component onChange handler
    let formState = {
      country: 'India',
      state: 'Tamil Nadu',
    };

    const handleCountryChange = (newCountry) => {
      formState.country = newCountry;
      // Requirement: Immediately clear previously selected state on country change
      formState.state = '';
    };

    // Step 1: Initial state is India -> Tamil Nadu
    assert.equal(formState.country, 'India');
    assert.equal(formState.state, 'Tamil Nadu');
    assert.ok(getStatesForCountry(formState.country).includes(formState.state));

    // Step 2: User changes India to USA
    handleCountryChange('United States');
    assert.equal(formState.country, 'United States');
    assert.equal(formState.state, '', 'State must be immediately cleared when country changes to USA');
    assert.equal(getStatesForCountry(formState.country).includes('Tamil Nadu'), false, 'Tamil Nadu must not be in USA states list');

    // User selects a valid US state
    formState.state = 'California';
    assert.equal(isValidStateForCountry(formState.country, formState.state), true);

    // Step 3: User changes USA to Singapore
    handleCountryChange('Singapore');
    assert.equal(formState.country, 'Singapore');
    assert.equal(formState.state, '', 'State must be cleared when country changes to Singapore');
    assert.equal(getStatesForCountry(formState.country).includes('California'), false, 'California must not be in Singapore regions');

    // User selects Singapore region
    formState.state = 'Central Singapore';
    assert.equal(isValidStateForCountry(formState.country, formState.state), true);

    // Step 4: User changes Singapore back to India
    handleCountryChange('India');
    assert.equal(formState.country, 'India');
    assert.equal(formState.state, '', 'State must be cleared when switching back to India');
    assert.ok(getStatesForCountry(formState.country).includes('Tamil Nadu'));

    // Step 5: Rapid repeated switching without retaining stale values
    handleCountryChange('United States');
    assert.equal(formState.state, '');
    handleCountryChange('Singapore');
    assert.equal(formState.state, '');
    handleCountryChange('United Arab Emirates');
    assert.equal(formState.state, '');
    handleCountryChange('India');
    assert.equal(formState.state, '');
  });

  await t.test('5. Data Binding & Validation on Saved / Restored Customer Records', () => {
    // Scenario 5.1: Valid existing record (India -> Tamil Nadu)
    const savedCustomer1 = {
      name: 'Ramesh Hardware',
      country: 'India',
      state: 'Tamil Nadu',
    };
    let restoredState1 = savedCustomer1.state;
    if (restoredState1 && !isValidStateForCountry(savedCustomer1.country, restoredState1)) {
      restoredState1 = '';
    }
    assert.equal(restoredState1, 'Tamil Nadu', 'Valid state should be preserved when editing');

    // Scenario 5.2: Corrupt / stale saved data (USA -> Tamil Nadu)
    const savedCustomer2 = {
      name: 'Acme US Corp',
      country: 'United States',
      state: 'Tamil Nadu',
    };
    let restoredState2 = savedCustomer2.state;
    if (restoredState2 && !isValidStateForCountry(savedCustomer2.country, restoredState2)) {
      restoredState2 = '';
    }
    assert.equal(restoredState2, '', 'Mismatched stale state must be sanitized and cleared');

    // Scenario 5.3: Valid US customer (USA -> Texas)
    const savedCustomer3 = {
      name: 'Austin Supplies',
      country: 'United States',
      state: 'Texas',
    };
    let restoredState3 = savedCustomer3.state;
    if (restoredState3 && !isValidStateForCountry(savedCustomer3.country, restoredState3)) {
      restoredState3 = '';
    }
    assert.equal(restoredState3, 'Texas', 'Valid US state should be preserved');
  });

  await t.test('6. Backend API Validation: Rejection of Invalid Country-State Combinations', async () => {
    const invokeHandler = (handler, req, res) => {
      return new Promise((resolve, reject) => {
        const next = (err) => {
          if (err) reject(err);
          else resolve();
        };
        const origJson = res.json.bind(res);
        res.json = (data) => {
          origJson(data);
          resolve(data);
        };
        handler(req, res, next);
      });
    };

    // 6.1 Creating customer with invalid country-state combination must be rejected
    const invalidReq = {
      body: {
        name: 'Invalid Test Customer',
        phone: '9988776655',
        country: 'United States',
        state: 'Tamil Nadu', // Invalid! Tamil Nadu is in India, not USA
      },
      user: { role: 'ADMIN', businessId: 'busi-01' },
    };

    let caughtError = null;
    const res = {
      status(s) { this.statusCode = s; return this; },
      json(data) { this.data = data; return this; },
    };

    try {
      await invokeHandler(customerController.createCustomer, invalidReq, res);
    } catch (err) {
      caughtError = err;
    }

    assert.ok(caughtError, 'Backend must reject invalid country-state combination');
    assert.equal(caughtError.statusCode, 400);
    assert.ok(caughtError.message.includes("does not belong to country 'United States'"));

    // 6.2 Creating customer with valid USA country-state combination must succeed
    const validReq = {
      body: {
        name: 'Valid US Customer ' + Date.now(),
        phone: '12345' + Math.floor(10000 + Math.random() * 90000),
        country: 'United States',
        state: 'California',
      },
      user: { role: 'ADMIN', businessId: 'busi-01' },
    };

    let createdData = null;
    const res2 = {
      status(s) { this.statusCode = s; return this; },
      json(data) { createdData = data; return this; },
    };

    await invokeHandler(customerController.createCustomer, validReq, res2);
    assert.ok(createdData, 'Customer creation should succeed');
    assert.equal(createdData.data.customer.state, 'California');
    assert.equal(createdData.data.customer.country, 'United States');

    // 6.3 Updating customer to Singapore with valid region
    const customerId = createdData.data.customer.id;
    const updateReq = {
      params: { id: customerId },
      body: {
        country: 'Singapore',
        state: 'Central Singapore',
      },
      user: { role: 'ADMIN', businessId: 'busi-01' },
    };

    let updatedData = null;
    const res3 = {
      status(s) { this.statusCode = s; return this; },
      json(data) { updatedData = data; return this; },
    };

    await invokeHandler(customerController.updateCustomer, updateReq, res3);
    assert.ok(updatedData, 'Customer update should succeed');
    assert.equal(updatedData.data.customer.country, 'Singapore');
    assert.equal(updatedData.data.customer.state, 'Central Singapore');

    // 6.4 Updating customer with mismatch (Singapore with California) must be rejected
    const invalidUpdateReq = {
      params: { id: customerId },
      body: {
        country: 'Singapore',
        state: 'California', // Invalid! California is USA
      },
      user: { role: 'ADMIN', businessId: 'busi-01' },
    };

    let updateCaughtError = null;
    try {
      await invokeHandler(customerController.updateCustomer, invalidUpdateReq, res3);
    } catch (err) {
      updateCaughtError = err;
    }
    assert.ok(updateCaughtError, 'Updating with invalid country-state combination must be rejected');
    assert.equal(updateCaughtError.statusCode, 400);
  });
});
