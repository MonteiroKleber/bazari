import { buildApp } from '../server.js';

async function main() {
  const app = await buildApp();
  const p = await app.inject({ method: 'GET', url: '/categories?root=products&level=1' });
  console.log('GET /categories?root=products&level=1', p.statusCode);
  const products = p.json();
  console.log(Array.isArray(products) ? `products level=1: ${products.length}` : products);

  const s = await app.inject({ method: 'GET', url: '/categories?root=services&level=1' });
  console.log('GET /categories?root=services&level=1', s.statusCode);
  const services = s.json();
  console.log(Array.isArray(services) ? `services level=1: ${services.length}` : services);

  const eff = await app.inject({ method: 'GET', url: '/categories/effective-spec?path=tecnologia/eletronicos/celulares' });
  console.log('GET /categories/effective-spec (tecnologia/eletronicos/celulares)', eff.statusCode);
  console.log(eff.body);

  await app.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
