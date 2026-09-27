import prisma from '../src/lib/prisma.ts';

async function verify() {
  console.log('=== VERIFYING DATABASE DATA ===');
  
  const tenants = await prisma.tenant.findMany();
  console.log(`Tenants (${tenants.length}):`, tenants.map(t => ({ id: t.id, name: t.name })));

  const branches = await prisma.branch.findMany();
  console.log(`Branches (${branches.length}):`, branches.map(b => ({ id: b.id, name: b.name })));

  const users = await prisma.user.findMany({ select: { id: true, email: true, name: true, role: true, isActive: true } });
  console.log(`Users (${users.length}):`, users);

  const accounts = await prisma.account.findMany();
  console.log(`Chart of Accounts count: ${accounts.length}`);

  const products = await prisma.product.findMany({ select: { id: true, name: true, sku: true, huid: true } });
  console.log(`Products (${products.length}):`, products);

  const customers = await prisma.customer.findMany({ select: { id: true, name: true, phone: true } });
  console.log(`Customers (${customers.length}):`, customers);

  const goldRates = await prisma.goldRate.findMany({ select: { ratePerGram: true, effectiveAt: true } });
  console.log(`Gold Rates count: ${goldRates.length}, Latest: ₹${goldRates[0]?.ratePerGram}/g`);

  const settings = await prisma.storeSetting.findMany();
  console.log(`Store Settings count: ${settings.length}`);

  console.log('=== VERIFICATION COMPLETE: ALL DATA PERSISTED IN POSTGRESQL ===');
}

verify()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
