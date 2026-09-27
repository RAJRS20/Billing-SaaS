import { PrismaClient, UserRole, MakingChargeType, WastageType, AccountType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting JewelBill SaaS database seed...");

  // 1. Subscription Plan
  const enterprisePlan = await prisma.subscriptionPlan.upsert({
    where: { slug: "enterprise-cloud" },
    update: {},
    create: {
      name: "Jewellery Enterprise Cloud",
      slug: "enterprise-cloud",
      price: 14999.00,
      billingCycle: "YEARLY",
      maxUsers: 25,
      maxBranches: 5,
      maxInvoices: 50000,
      features: JSON.stringify([
        "HUID BIS Compliance",
        "Gold Weight Reconciliation",
        "Multi-Branch Transfers",
        "ESC/POS Thermal & Laser Invoicing",
        "Customer & Supplier Ledgers",
        "Karigar & Job Work Tracking",
        "Double-Entry Accounting Journal"
      ]),
      isActive: true,
    },
  });

  // 2. Tenant
  const tenant = await prisma.tenant.upsert({
    where: { email: "contact@srilakshmijewellers.com" },
    update: {},
    create: {
      name: "Sri Lakshmi Jewellers",
      email: "contact@srilakshmijewellers.com",
      phone: "+91 98765 43210",
      address: "142, Car Street, Near Raja Temple",
      city: "Coimbatore",
      state: "Tamil Nadu",
      pincode: "641001",
      gstin: "33AAAAA0000A1Z5",
      panNumber: "AAAAA0000A",
      isActive: true,
    },
  });

  // 3. Branches
  const mainBranch = await prisma.branch.upsert({
    where: { id: "branch-main" },
    update: {},
    create: {
      id: "branch-main",
      tenantId: tenant.id,
      name: "Main Showroom (Car Street)",
      address: "142, Car Street, Coimbatore - 641001",
      phone: "+91 98765 43210",
      isDefault: true,
      isActive: true,
    },
  });

  const mallBranch = await prisma.branch.upsert({
    where: { id: "branch-mall" },
    update: {},
    create: {
      id: "branch-mall",
      tenantId: tenant.id,
      name: "Express Store (Brookefields Mall)",
      address: "Unit 204, Second Floor, Brookefields Mall, Coimbatore",
      phone: "+91 98765 43211",
      isDefault: false,
      isActive: true,
    },
  });

  // 4. Users with Securely Hashed Passwords
  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const managerPasswordHash = await bcrypt.hash("Manager@123", 12);
  const cashierPasswordHash = await bcrypt.hash("Cashier@123", 12);

  const owner = await prisma.user.upsert({
    where: { email: "admin@srilakshmi.com" },
    update: { passwordHash },
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      name: "Rajesh Kumar (Owner)",
      email: "admin@srilakshmi.com",
      passwordHash,
      role: UserRole.SHOP_OWNER,
      isActive: true,
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@srilakshmi.com" },
    update: { passwordHash: managerPasswordHash },
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      name: "Rajasekhar M (Manager)",
      email: "manager@srilakshmi.com",
      passwordHash: managerPasswordHash,
      role: UserRole.MANAGER,
      isActive: true,
    },
  });

  const cashier = await prisma.user.upsert({
    where: { email: "cashier@srilakshmi.com" },
    update: { passwordHash: cashierPasswordHash },
    create: {
      tenantId: tenant.id,
      branchId: mainBranch.id,
      name: "Anitha Devi (Cashier)",
      email: "cashier@srilakshmi.com",
      passwordHash: cashierPasswordHash,
      role: UserRole.CASHIER,
      isActive: true,
    },
  });

  // 5. Store Settings & Compliance
  await prisma.storeSetting.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      tradeLegalName: "Sri Lakshmi Jewellery Works Pvt Ltd",
      bisLicenseNumber: "HM/TN/2024/9876",
      ahcCenterName: "Chennai Assaying & Hallmarking Centre (AHC-042)",
      invoicePrefix: "INV-2026-",
      estimatePrefix: "EST-2026-",
      goldGstPercent: 3.0,
      makingGstPercent: 5.0,
      cashPanLimit: 200000,
      enforceHuid: true,
      allowNegativeStock: false,
    },
  });

  // 6. Chart of Accounts (Double-Entry Financial Layer)
  const defaultAccounts = [
    { code: "1010", name: "Cash in Drawer", type: AccountType.ASSET },
    { code: "1020", name: "Bank Account (HDFC)", type: AccountType.ASSET },
    { code: "1025", name: "UPI Digital Collections", type: AccountType.ASSET },
    { code: "1030", name: "Accounts Receivable - Customers", type: AccountType.ASSET },
    { code: "1040", name: "Gold Jewellery Finished Goods Inventory", type: AccountType.ASSET },
    { code: "1050", name: "Old Gold Bullion & Scrap Stock", type: AccountType.ASSET },
    { code: "2010", name: "Accounts Payable - Bullion & Jewel Suppliers", type: AccountType.LIABILITY },
    { code: "2020", name: "Customer Advance Deposits", type: AccountType.LIABILITY },
    { code: "2031", name: "CGST Output Payable (1.5%)", type: AccountType.LIABILITY },
    { code: "2032", name: "SGST Output Payable (1.5%)", type: AccountType.LIABILITY },
    { code: "3010", name: "Owner Capital & Equity", type: AccountType.EQUITY },
    { code: "4010", name: "Gold Sales Revenue", type: AccountType.REVENUE },
    { code: "4020", name: "Making Charges Revenue", type: AccountType.REVENUE },
    { code: "4030", name: "Stone & Gemstone Revenue", type: AccountType.REVENUE },
    { code: "5010", name: "Cost of Goods Sold (Bullion Inward)", type: AccountType.EXPENSE },
    { code: "5020", name: "Operating Expenses (Rent, Salary, Utilities)", type: AccountType.EXPENSE },
    { code: "5030", name: "Hallmarking & Assaying Charges", type: AccountType.EXPENSE },
  ];

  for (const acc of defaultAccounts) {
    await prisma.account.upsert({
      where: { tenantId_code: { tenantId: tenant.id, code: acc.code } },
      update: {},
      create: {
        tenantId: tenant.id,
        code: acc.code,
        name: acc.name,
        type: acc.type,
      },
    });
  }

  // 7. Metals & Purities
  const goldMetal = await prisma.metal.upsert({
    where: { tenantId_symbol: { tenantId: tenant.id, symbol: "AU" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Gold",
      symbol: "AU",
    },
  });

  const purity24K = await prisma.purity.upsert({
    where: { tenantId_metalId_name: { tenantId: tenant.id, metalId: goldMetal.id, name: "24K" } },
    update: {},
    create: {
      tenantId: tenant.id,
      metalId: goldMetal.id,
      name: "24K",
      fineness: 0.9990,
    },
  });

  const purity22K = await prisma.purity.upsert({
    where: { tenantId_metalId_name: { tenantId: tenant.id, metalId: goldMetal.id, name: "22K" } },
    update: {},
    create: {
      tenantId: tenant.id,
      metalId: goldMetal.id,
      name: "22K",
      fineness: 0.9160,
    },
  });

  const purity18K = await prisma.purity.upsert({
    where: { tenantId_metalId_name: { tenantId: tenant.id, metalId: goldMetal.id, name: "18K" } },
    update: {},
    create: {
      tenantId: tenant.id,
      metalId: goldMetal.id,
      name: "18K",
      fineness: 0.7500,
    },
  });

  // 8. Active Gold Rates
  await prisma.goldRate.createMany({
    data: [
      { tenantId: tenant.id, metalId: goldMetal.id, purityId: purity24K.id, ratePerGram: 6672.00, updatedById: owner.id },
      { tenantId: tenant.id, metalId: goldMetal.id, purityId: purity22K.id, ratePerGram: 6120.00, updatedById: owner.id },
      { tenantId: tenant.id, metalId: goldMetal.id, purityId: purity18K.id, ratePerGram: 5004.00, updatedById: owner.id },
    ],
  });

  // 9. Product Categories
  const catNecklace = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Necklace" } },
    update: {},
    create: { tenantId: tenant.id, name: "Necklace" },
  });

  const catBangle = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Bangle" } },
    update: {},
    create: { tenantId: tenant.id, name: "Bangle" },
  });

  const catRing = await prisma.productCategory.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Ring" } },
    update: {},
    create: { tenantId: tenant.id, name: "Ring" },
  });

  // 10. Sample Products with HUID
  const sampleProducts = [
    {
      sku: "NK-22K-001",
      name: "22K Antique Floral Temple Necklace",
      barcode: "890123400001",
      huid: "HA9876",
      grossWeight: 24.85,
      stoneWeight: 0.65,
      netWeight: 24.20,
      makingChargeType: MakingChargeType.PER_GRAM,
      makingChargeValue: 520.00,
      wastageType: WastageType.PERCENTAGE,
      wastageValue: 3.5,
      categoryId: catNecklace.id,
      purityId: purity22K.id,
    },
    {
      sku: "BG-22K-003",
      name: "22K Traditional CNC Cut Gold Bangles",
      barcode: "890123400003",
      huid: "BC1092",
      grossWeight: 36.40,
      stoneWeight: 0.00,
      netWeight: 36.40,
      makingChargeType: MakingChargeType.PER_GRAM,
      makingChargeValue: 480.00,
      wastageType: WastageType.PERCENTAGE,
      wastageValue: 3.0,
      categoryId: catBangle.id,
      purityId: purity22K.id,
    },
    {
      sku: "RG-18K-002",
      name: "18K Solitaire Diamond Engagement Ring",
      barcode: "890123400002",
      huid: "RB4521",
      grossWeight: 4.80,
      stoneWeight: 0.12,
      netWeight: 4.68,
      makingChargeType: MakingChargeType.PERCENTAGE,
      makingChargeValue: 15.00,
      wastageType: WastageType.PERCENTAGE,
      wastageValue: 2.0,
      stoneChargeFixed: 35000.00,
      categoryId: catRing.id,
      purityId: purity18K.id,
    },
  ];

  for (const prod of sampleProducts) {
    const createdProduct = await prisma.product.upsert({
      where: { tenantId_sku: { tenantId: tenant.id, sku: prod.sku } },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        categoryId: prod.categoryId,
        metalId: goldMetal.id,
        purityId: prod.purityId,
        sku: prod.sku,
        name: prod.name,
        barcode: prod.barcode,
        huid: prod.huid,
        grossWeight: prod.grossWeight,
        stoneWeight: prod.stoneWeight,
        netWeight: prod.netWeight,
        makingChargeType: prod.makingChargeType,
        makingChargeValue: prod.makingChargeValue,
        wastageType: prod.wastageType,
        wastageValue: prod.wastageValue,
        stoneChargeFixed: prod.stoneChargeFixed ?? 0,
      },
    });

    // Create Inventory balance record
    await prisma.inventory.upsert({
      where: {
        tenantId_branchId_productId: {
          tenantId: tenant.id,
          branchId: mainBranch.id,
          productId: createdProduct.id,
        },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        branchId: mainBranch.id,
        productId: createdProduct.id,
        quantity: 5,
      },
    });
  }

  // 11. Sample Customers
  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "9876543210" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Priya Sharma",
      phone: "9876543210",
      city: "Coimbatore",
      panNumber: "ABCPS1234F",
      creditLimit: 50000.00,
    },
  });

  await prisma.customer.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "9876501234" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Lakshmi Devi",
      phone: "9876501234",
      city: "Salem",
      creditLimit: 100000.00,
    },
  });

  // 12. Sample Suppliers
  await prisma.supplier.upsert({
    where: { tenantId_phone: { tenantId: tenant.id, phone: "9443210987" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Malabar Bullion Refineries",
      phone: "9443210987",
      gstin: "33AABCM1234F1Z9",
      panNumber: "AABCM1234F",
      address: "12, Jewellers Street, Thrissur, Kerala",
    },
  });

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
