import { sanityClient } from './sanity-client';

async function countProducts() {
  const total = await sanityClient.fetch<number>(`count(*[_type == "product"])`);
  const withTitle = await sanityClient.fetch<number>(`count(*[_type == "product" && defined(title)])`);
  const withName = await sanityClient.fetch<number>(`count(*[_type == "product" && defined(name)])`);

  console.log(`Total products: ${total}`);
  console.log(`With 'title' field (new): ${withTitle}`);
  console.log(`With 'name' field (old): ${withName}`);
  console.log(`\nNew products being imported: ${withTitle}`);
}

countProducts();
