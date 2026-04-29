import { sanityClient } from './sanity-client';

async function checkProducts() {
  console.log('Checking product data quality...\n');

  // Count products with complete data
  const withTitle = await sanityClient.fetch<number>(
    `count(*[_type == "product" && defined(title)])`
  );

  const withType1 = await sanityClient.fetch<number>(
    `count(*[_type == "product" && defined(productType1)])`
  );

  const complete = await sanityClient.fetch<number>(
    `count(*[_type == "product" && defined(title) && defined(productType1) && defined(brand)])`
  );

  console.log(`Products with title: ${withTitle}`);
  console.log(`Products with productType1: ${withType1}`);
  console.log(`Products with complete data: ${complete}\n`);

  // Get sample of complete products
  const samples = await sanityClient.fetch(`
    *[_type == "product" && defined(title) && defined(productType1)][0...3] {
      title,
      brand,
      productType1,
      productType2,
      price
    }
  `);

  console.log('Sample products with complete data:');
  console.log(JSON.stringify(samples, null, 2));
}

checkProducts();
