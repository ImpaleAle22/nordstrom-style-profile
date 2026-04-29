import { sanityClient } from './sanity-client';

async function inspectProduct() {
  const sample = await sanityClient.fetch(`*[_type == "product"][0]`);

  console.log('First product in Sanity:');
  console.log('Fields:', Object.keys(sample).sort());
  console.log('\nFull product:');
  console.log(JSON.stringify(sample, null, 2));
}

inspectProduct();
