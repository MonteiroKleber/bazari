// V-1: Script para testar todos os cenários de categorias (2025-01-11)
// Valida que todas as categorias conseguem criar produtos sem erro 400

import { PrismaClient } from '@prisma/client';
import { resolveEffectiveSpecByCategoryId, processAttributes } from '../src/lib/categoryResolver.js';

const prisma = new PrismaClient();

interface TestScenario {
  categoryPath: string[];
  categoryId: string;
  attributes: any;
  expectedResult: 'success' | 'error';
  description: string;
}

async function main() {
  console.log('🧪 Testando todos os cenários possíveis de categorias...\n');

  // Definir cenários de teste
  const testScenarios: TestScenario[] = [
    // Cenário 1: Categoria com spec completo (DEVE FUNCIONAR)
    {
      categoryPath: ["casa-decoracao", "decoracao", "quadros"],
      categoryId: "products-casa-decoracao-decoracao-quadros",
      attributes: {
        ano: 2020,
        titulo: "Teste",
        artista: "Artista Teste",
        peso_kg: 2,
        suporte: "Tela",
        tecnica: "Óleo",
        altura_cm: 50,
        largura_cm: 40,
        orientacao: "Retrato",
        estado_conservacao: "Novo"
      },
      expectedResult: 'success',
      description: 'Categoria com CategorySpec completo'
    },

    // Cenário 2: Categoria sem spec (AGORA DEVE FUNCIONAR)
    {
      categoryPath: ["moda-acessorios", "calcados", "sandalias-chinelos"],
      categoryId: "products-moda-acessorios-calcados-sandalias-chinelos",
      attributes: {},
      expectedResult: 'success',
      description: 'Categoria sem CategorySpec (attributes vazios)'
    },

    // Cenário 3: Categoria sem spec com alguns atributos
    {
      categoryPath: ["moda-acessorios", "calcados", "sandalias-chinelos"],
      categoryId: "products-moda-acessorios-calcados-sandalias-chinelos",
      attributes: {
        cor: "Preto",
        marca: "Nike"
      },
      expectedResult: 'success',
      description: 'Categoria sem CategorySpec (com atributos opcionais)'
    },

    // Cenário 4: Categoria inexistente (DEVE DAR ERRO)
    {
      categoryPath: ["categoria-inexistente"],
      categoryId: "products-categoria-inexistente",
      attributes: {},
      expectedResult: 'error',
      description: 'Categoria inexistente'
    },

    // Cenário 5: Categoria com spec mas atributos obrigatórios faltando
    {
      categoryPath: ["casa-decoracao", "decoracao", "quadros"],
      categoryId: "products-casa-decoracao-decoracao-quadros",
      attributes: {
        // Faltando campos obrigatórios
        cor: "Azul"
      },
      expectedResult: 'error',
      description: 'Categoria com spec mas campos obrigatórios ausentes'
    },

    // Cenário 6: Mais categorias sem spec (se existirem)
    {
      categoryPath: ["moda-acessorios", "calcados", "tenis"],
      categoryId: "products-moda-acessorios-calcados-tenis",
      attributes: {},
      expectedResult: 'success',
      description: 'Categoria calçados/tênis sem spec'
    },

    // Cenário 7: Categoria de tecnologia
    {
      categoryPath: ["tecnologia", "eletronicos", "celulares"],
      categoryId: "products-tecnologia-eletronicos-celulares",
      attributes: {},
      expectedResult: 'success',
      description: 'Categoria tecnologia sem spec específico'
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const scenario of testScenarios) {
    totalTests++;
    console.log(`\n📋 Teste ${totalTests}: ${scenario.description}`);
    console.log(`   CategoryPath: ${scenario.categoryPath.join(' > ')}`);
    console.log(`   CategoryId: ${scenario.categoryId}`);
    console.log(`   Attributes: ${JSON.stringify(scenario.attributes)}`);
    console.log(`   Expected: ${scenario.expectedResult}`);

    try {
      // Testar resolução da spec
      const spec = await resolveEffectiveSpecByCategoryId(scenario.categoryId);
      console.log(`   ✅ Spec resolvida: v${spec.version}`);

      // Testar processamento dos atributos
      const result = await processAttributes(scenario.attributes, { categoryId: scenario.categoryId });
      console.log(`   ✅ Atributos processados: ${Object.keys(result.attributes).length} campos`);

      if (Object.keys(result.errors).length > 0) {
        console.log(`   ⚠️ Erros de validação: ${JSON.stringify(result.errors)}`);
        
        if (scenario.expectedResult === 'success') {
          console.log(`   ❌ FALHA: Esperava sucesso mas houve erros de validação`);
          failedTests++;
        } else {
          console.log(`   ✅ SUCESSO: Erros esperados conforme cenário`);
          passedTests++;
        }
      } else {
        if (scenario.expectedResult === 'success') {
          console.log(`   ✅ SUCESSO: Processamento bem-sucedido conforme esperado`);
          passedTests++;
        } else {
          console.log(`   ❌ FALHA: Esperava erro mas o processamento foi bem-sucedido`);
          failedTests++;
        }
      }

    } catch (error) {
      console.log(`   ❌ Erro: ${error instanceof Error ? error.message : error}`);
      
      if (scenario.expectedResult === 'error') {
        console.log(`   ✅ SUCESSO: Erro esperado conforme cenário`);
        passedTests++;
      } else {
        console.log(`   ❌ FALHA: Esperava sucesso mas houve erro`);
        failedTests++;
      }
    }
  }

  // Resultado final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO FINAL DOS TESTES');
  console.log('='.repeat(60));
  console.log(`Total de testes: ${totalTests}`);
  console.log(`Testes aprovados: ${passedTests} ✅`);
  console.log(`Testes falharam: ${failedTests} ❌`);
  console.log(`Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failedTests === 0) {
    console.log('\n🎉 TODOS OS CENÁRIOS ESTÃO FUNCIONANDO CORRETAMENTE!');
  } else {
    console.log('\n⚠️ ALGUNS CENÁRIOS PRECISAM DE CORREÇÃO');
  }

  // Testar criação real de produtos para cenários críticos
  console.log('\n🧪 Testando criação real de produtos...');
  
  const criticalTests = [
    {
      title: "Teste Sandálias",
      daoId: "dao-test",
      categoryPath: ["moda-acessorios", "calcados", "sandalias-chinelos"],
      attributes: {},
      priceBzr: "100.00"
    },
    {
      title: "Teste Quadros", 
      daoId: "dao-test",
      categoryPath: ["casa-decoracao", "decoracao", "quadros"],
      attributes: {
        ano: 2020,
        titulo: "Teste Real",
        artista: "Artista",
        peso_kg: 1,
        suporte: "Tela",
        tecnica: "Óleo",
        altura_cm: 30,
        largura_cm: 40,
        orientacao: "Retrato",
        estado_conservacao: "Novo"
      },
      priceBzr: "500.00"
    }
  ];

  for (const test of criticalTests) {
    try {
      console.log(`\n🔧 Criando produto: ${test.title}`);
      
      // Simular criação (sem inserir no banco)
      const categoryId = `products-${test.categoryPath.join('-')}`;
      const spec = await resolveEffectiveSpecByCategoryId(categoryId);
      const processed = await processAttributes(test.attributes, { categoryId });
      
      if (Object.keys(processed.errors).length === 0) {
        console.log(`   ✅ ${test.title}: Criação simulada com sucesso`);
      } else {
        console.log(`   ❌ ${test.title}: Erros de validação: ${JSON.stringify(processed.errors)}`);
      }
      
    } catch (error) {
      console.log(`   ❌ ${test.title}: Erro - ${error instanceof Error ? error.message : error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro fatal no teste:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });