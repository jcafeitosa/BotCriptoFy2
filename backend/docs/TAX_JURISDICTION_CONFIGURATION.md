# Tax Jurisdiction Configuration - CEO Guide

**Status**: ✅ Production Ready
**Role Required**: CEO or Super Admin
**Impact**: Platform-wide

---

## 🎯 Overview

The Tax Jurisdiction Configuration system allows the **CEO to select the tax jurisdiction** for the entire platform. This is a critical decision that affects:

- ✅ All financial calculations (VAT, Corporate Tax, Personal Income Tax)
- ✅ Tax ID validation (CPF/CNPJ for Brazil, Personal Code/Business Code for Estonia)
- ✅ Invoice generation and fiscal compliance
- ✅ Tax reporting and filing
- ✅ Currency and locale settings

**Important**: This is a **platform-wide setting**, not per-tenant. All operations will use the configured jurisdiction.

---

## 🇧🇷🇪🇪 Available Jurisdictions

### Brazil (BR) 🇧🇷

**Best For**:
- Companies operating in Brazil
- Brazilian startups and SMEs
- Businesses needing NF-e compliance
- Companies with Brazilian customers/suppliers

**Features**:
- ✅ Complete Brazilian tax compliance
- ✅ CPF/CNPJ validation with check digits
- ✅ NF-e (Electronic Fiscal Document) support
- ✅ SPED integration ready
- ✅ Support for ICMS, ISS, PIS, COFINS, IRPJ, CSLL

**Tax Rates**:
- **VAT**: ICMS 17-20% (state), ISS 2-5% (municipal)
- **Corporate**: IRPJ 15% + CSLL 9% + PIS/COFINS 9.25% = ~33.25%
- **Personal**: Progressive 0-27.5%

---

### Estonia (EE) 🇪🇪

**Best For**:
- Tech startups planning to scale
- Digital nomads and remote entrepreneurs
- E-Residency company holders
- Companies focusing on growth/reinvestment
- EU-based businesses

**Features**:
- ✅ **Zero tax on retained profits** (unique in EU!)
- ✅ Tax only when distributing dividends
- ✅ E-Residency program support
- ✅ Simple 20% flat personal income tax
- ✅ 99% digital tax filing
- ✅ EU single market access

**Tax Rates**:
- **VAT**: Standard 22%, Reduced 9%, Zero 0%
- **Corporate**: 0% on retained, 20/80 on distributions
- **Personal**: Flat 20%

---

## 🚀 Quick Start (CEO)

### Step 1: View Available Jurisdictions

```bash
curl http://localhost:3000/api/v1/tax-jurisdiction/available
```

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "jurisdiction": "BR",
      "name": "Brazil",
      "flag": "🇧🇷",
      "description": "Brazilian tax system with full compliance...",
      "advantages": [...],
      "bestFor": [...],
      "taxRates": {...}
    },
    {
      "jurisdiction": "EE",
      "name": "Estonia",
      "flag": "🇪🇪",
      "description": "Estonian tax system with zero tax on retained profits...",
      "advantages": [...],
      "bestFor": [...],
      "taxRates": {...}
    }
  ]
}
```

### Step 2: Configure Platform Jurisdiction

```bash
# Set to Brazil
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "Content-Type: application/json" \
  -H "x-user-id: ceo-user-123" \
  -H "x-user-role: CEO" \
  -d '{"jurisdiction": "BR"}'

# OR set to Estonia
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "Content-Type: application/json" \
  -H "x-user-id: ceo-user-123" \
  -H "x-user-role: CEO" \
  -d '{"jurisdiction": "EE"}'
```

**Response**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "EE",
    "countryName": "Estonia",
    "countryCode": "EST",
    "currency": "EUR",
    "locale": "et-EE",
    "taxSystem": {...},
    "configuredAt": "2025-01-16T...",
    "configuredBy": "ceo-user-123"
  },
  "message": "Tax jurisdiction successfully set to EE"
}
```

### Step 3: Verify Configuration

```bash
curl http://localhost:3000/api/v1/tax-jurisdiction/current
```

---

## 📋 API Reference

### Public Endpoints (All Users)

#### GET `/api/v1/tax-jurisdiction/current`
Get the currently configured tax jurisdiction.

**Response**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "EE",
    "countryName": "Estonia",
    "currency": "EUR",
    "locale": "et-EE",
    ...
  }
}
```

#### GET `/api/v1/tax-jurisdiction/available`
Get all available jurisdictions for selection.

#### GET `/api/v1/tax-jurisdiction/:jurisdiction`
Get detailed information about a specific jurisdiction.

**Example**: `/api/v1/tax-jurisdiction/EE`

---

### CEO-Only Endpoints

#### POST `/api/v1/tax-jurisdiction/configure` 🔒
Set the platform tax jurisdiction.

**Headers**:
- `x-user-id`: CEO user ID
- `x-user-role`: Must be "CEO" or "SUPER_ADMIN"

**Body**:
```json
{
  "jurisdiction": "BR" // or "EE"
}
```

**Authorization**: Only CEO or Super Admin can call this endpoint.

#### DELETE `/api/v1/tax-jurisdiction/reset` 🔒
Reset the jurisdiction (for testing/migration).

**⚠️ Warning**: Use with extreme caution!

---

### Testing Endpoints

#### POST `/api/v1/tax-jurisdiction/test/vat`
Test VAT calculation with current jurisdiction.

**Body**:
```json
{
  "amount": 1000,
  "category": "standard", // optional
  "stateCode": "SP",      // for Brazil
  "cityCode": "SAO_PAULO" // for Brazil
}
```

**Response (Brazil)**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "BR",
    "taxType": "ICMS",
    "amount": 1000,
    "rate": 18,
    "vatAmount": 180,
    "totalAmount": 1180,
    "stateCode": "SP"
  }
}
```

**Response (Estonia)**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "EE",
    "taxType": "VAT",
    "vatAmount": 220,
    "rate": 22,
    "totalAmount": 1220
  }
}
```

#### POST `/api/v1/tax-jurisdiction/test/corporate-tax`
Test corporate tax calculation.

**Body**:
```json
{
  "amount": 100000,
  "isDistribution": false // for Estonia: false = retained (0% tax)
}
```

**Response (Brazil)**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "BR",
    "taxType": "CORPORATE",
    "taxableAmount": 100000,
    "irpj": 15000,
    "csll": 9000,
    "totalTax": 24000,
    "effectiveRate": 24,
    "note": "Tax on all profits (retained and distributed)"
  }
}
```

**Response (Estonia, retained)**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "EE",
    "taxType": "CORPORATE",
    "taxableAmount": 100000,
    "totalTax": 0,
    "effectiveRate": 0,
    "note": "Zero tax on retained profits (Estonia unique feature)"
  }
}
```

**Response (Estonia, distributed)**:
```json
{
  "success": true,
  "data": {
    "jurisdiction": "EE",
    "taxType": "CORPORATE",
    "grossDistribution": 100000,
    "taxAmount": 16666.67,
    "netDistribution": 83333.33,
    "effectiveRate": 25,
    "note": "Tax only on distributed profits"
  }
}
```

#### POST `/api/v1/tax-jurisdiction/test/validate-tax-id`
Validate tax ID with current jurisdiction.

**Body**:
```json
{
  "taxId": "123.456.789-09", // CPF for Brazil
  "type": "personal"          // or "business", "vat"
}
```

**Response**:
```json
{
  "success": true,
  "valid": true,
  "formatted": "123.456.789-09"
}
```

---

## 💡 Usage Examples

### Example 1: Brazilian Startup

```bash
# Configure for Brazil
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "x-user-role: CEO" \
  -d '{"jurisdiction": "BR"}'

# Test ICMS calculation
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/vat \
  -d '{"amount": 10000, "stateCode": "SP"}'
# Result: ICMS 18% = R$ 1,800

# Validate CNPJ
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/validate-tax-id \
  -d '{"taxId": "12.345.678/0001-95", "type": "business"}'
# Result: valid=true if CNPJ is correct
```

### Example 2: E-Residency Company

```bash
# Configure for Estonia
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "x-user-role: CEO" \
  -d '{"jurisdiction": "EE"}'

# Test corporate tax on retained profits
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/corporate-tax \
  -d '{"amount": 50000, "isDistribution": false}'
# Result: 0% tax! 🎉

# Test corporate tax on dividends
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/corporate-tax \
  -d '{"amount": 20000, "isDistribution": true}'
# Result: €3,333.33 tax (20/80 formula)

# Validate Estonian VAT number
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/validate-tax-id \
  -d '{"taxId": "EE100931558", "type": "vat"}'
# Result: valid=true, formatted="EE 100 931 558"
```

---

## 🔒 Security & Authorization

### Role Requirements

| Endpoint | Required Role | Impact |
|----------|---------------|---------|
| `GET /current` | Any user | Read-only |
| `GET /available` | Any user | Read-only |
| `POST /configure` | CEO or SUPER_ADMIN | **Platform-wide** |
| `DELETE /reset` | CEO or SUPER_ADMIN | **Platform-wide** |
| `POST /test/*` | Any user | Test only |

### Authorization Flow

```typescript
// Headers required for CEO operations
{
  "x-user-id": "user-uuid",
  "x-user-role": "CEO" // or "SUPER_ADMIN"
}

// In production, use JWT token:
{
  "Authorization": "Bearer <jwt-token>"
}
```

### Error Responses

**Unauthorized**:
```json
{
  "success": false,
  "error": "Only CEO or Super Admin can set tax jurisdiction"
}
```

**Jurisdiction Not Configured**:
```json
{
  "success": false,
  "error": "Tax jurisdiction not configured. CEO must set jurisdiction first."
}
```

---

## ⚠️ Important Considerations

### Before Configuring

✅ **Choose carefully** - This affects all financial operations
✅ **Understand tax implications** - Consult with tax advisor
✅ **Consider business location** - Where are your customers/operations?
✅ **Check compliance requirements** - Local regulations may require specific jurisdiction
✅ **Plan for migration** - Changing jurisdiction later requires data migration

### After Configuring

✅ **Inform team** - All developers should know the jurisdiction
✅ **Update documentation** - Document why this jurisdiction was chosen
✅ **Test thoroughly** - Use test endpoints to verify calculations
✅ **Monitor compliance** - Ensure ongoing compliance with local laws
✅ **Review annually** - Tax laws change, review configuration yearly

### Changing Jurisdiction

⚠️ **Caution**: Changing jurisdiction after operations have started is complex:

1. **Data migration** - Historical data may need conversion
2. **Tax recalculation** - Past transactions may need adjustment
3. **Compliance gap** - Temporary compliance issues possible
4. **Audit trail** - Must maintain records of change
5. **Legal review** - Consult lawyer before changing

**Recommendation**: Set correctly from the start!

---

## 🧪 Testing Guide

### Test Scenario 1: Brazil Configuration

```bash
# 1. Configure Brazil
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "x-user-role: CEO" -d '{"jurisdiction": "BR"}'

# 2. Test VAT (ICMS)
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/vat \
  -d '{"amount": 1000, "stateCode": "SP"}'
# Expected: 18% = R$ 180

# 3. Test Corporate Tax
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/corporate-tax \
  -d '{"amount": 100000}'
# Expected: 24% = R$ 24,000 (IRPJ 15% + CSLL 9%)

# 4. Validate CPF
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/validate-tax-id \
  -d '{"taxId": "123.456.789-09", "type": "personal"}'
```

### Test Scenario 2: Estonia Configuration

```bash
# 1. Configure Estonia
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/configure \
  -H "x-user-role: CEO" -d '{"jurisdiction": "EE"}'

# 2. Test VAT
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/vat \
  -d '{"amount": 1000, "category": "standard"}'
# Expected: 22% = €220

# 3. Test Corporate Tax (retained)
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/corporate-tax \
  -d '{"amount": 100000, "isDistribution": false}'
# Expected: 0% = €0 🎉

# 4. Test Corporate Tax (distributed)
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/corporate-tax \
  -d '{"amount": 100000, "isDistribution": true}'
# Expected: 25% effective = €16,666.67

# 5. Validate Personal Code
curl -X POST http://localhost:3000/api/v1/tax-jurisdiction/test/validate-tax-id \
  -d '{"taxId": "37605030299", "type": "personal"}'
```

---

## 📊 Decision Matrix

| Factor | Choose Brazil (BR) | Choose Estonia (EE) |
|--------|-------------------|---------------------|
| **Location** | Operating in Brazil | EU/International |
| **Customers** | Brazilian market | Global/EU market |
| **Tax Strategy** | Standard corporate tax | Reinvestment focused |
| **Compliance** | Need NF-e, SPED | E-Residency, digital |
| **Tax Burden** | ~33% corporate | 0-25% (depends on distribution) |
| **Simplicity** | Complex (multiple taxes) | Simple (few taxes) |
| **Startup** | Local Brazilian startup | Tech/growth startup |
| **Currency** | BRL preferred | EUR preferred |

---

## 🎓 Best Practices

1. **Set Once**: Configure jurisdiction during initial setup
2. **Document Decision**: Record why this jurisdiction was chosen
3. **Test Thoroughly**: Use test endpoints before going live
4. **Monitor Changes**: Subscribe to tax law updates
5. **Annual Review**: Review configuration yearly
6. **Backup Plan**: Have migration plan if jurisdiction change needed
7. **Consult Experts**: Work with tax advisor for complex situations

---

## 📚 Additional Resources

### Brazil
- [Brazilian Tax System Guide](./BRAZIL_TAX_SYSTEM.md) (to be created)
- [NF-e Documentation](https://www.nfe.fazenda.gov.br/)
- [SPED System](http://sped.rfb.gov.br/)

### Estonia
- [Estonian Tax System Guide](./ESTONIA_TAX_SYSTEM.md)
- [E-Residency](https://e-resident.gov.ee/)
- [EMTA Tax Authority](https://www.emta.ee/en)

---

**Last Updated**: 2025-01-16
**Version**: 1.0.0
**Status**: Production Ready ✅
