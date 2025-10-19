import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Truck,
  DollarSign,
  Clock,
  MapPin,
  Shield,
  TrendingUp,
  Users,
  Smartphone,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';

export function DeliveryLandingPage() {
  const navigate = useNavigate();

  const renderHero = () => (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto text-center">
        <Badge className="mb-4" variant="secondary">
          🚀 Bazari Delivery Network
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Ganhe Dinheiro Fazendo Entregas
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Torne-se um entregador da Bazari e ganhe dinheiro com flexibilidade. Defina
          seus horários, escolha suas entregas e receba pagamentos instantâneos em BZR.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            onClick={() => navigate('/app/delivery/profile/setup')}
            className="text-lg"
          >
            <Truck className="mr-2 h-5 w-5" />
            Começar Agora
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              document
                .getElementById('how-it-works')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="text-lg"
          >
            Como Funciona
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 max-w-3xl mx-auto">
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">1000+</p>
            <p className="text-muted-foreground">Entregadores Ativos</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">50k+</p>
            <p className="text-muted-foreground">Entregas Realizadas</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-primary">4.8⭐</p>
            <p className="text-muted-foreground">Avaliação Média</p>
          </div>
        </div>
      </div>
    </section>
  );

  const renderHowItWorks = () => (
    <section id="how-it-works" className="py-20 px-4 bg-muted/50">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Como Funciona</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comece a ganhar dinheiro em 3 passos simples
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">1. Crie Seu Perfil</h3>
              <p className="text-muted-foreground">
                Cadastre-se gratuitamente e crie seu perfil de entregador. Adicione suas
                informações, veículo e raio de atuação.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">2. Aceite Entregas</h3>
              <p className="text-muted-foreground">
                Veja demandas próximas a você e escolha as que mais se encaixam na sua
                rota. Você tem total controle sobre o que aceitar.
              </p>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardContent className="pt-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-2">3. Receba Pagamentos</h3>
              <p className="text-muted-foreground">
                Ao concluir a entrega, receba o pagamento instantaneamente em sua
                carteira BZR. Sem complicações, sem espera.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  const renderBenefits = () => (
    <section className="py-20 px-4">
      <div className="container max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Por que Bazari Delivery?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vantagens exclusivas para nossos entregadores
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-600/10 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <CardTitle>Pagamentos Instantâneos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Receba seus ganhos imediatamente após cada entrega. Sem esperar dias ou
                semanas. Seu dinheiro, na hora que você precisa.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600/10 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle>Flexibilidade Total</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Trabalhe quando quiser. Defina seus horários, escolha suas rotas e tenha
                controle total sobre seu tempo. Você é seu próprio chefe.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/10 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <CardTitle>Ganhos Competitivos</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Taxas justas e transparentes. Quanto mais entregas você faz, mais você
                ganha. Sem taxas escondidas ou surpresas desagradáveis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-600/10 rounded-lg">
                  <Shield className="h-6 w-6 text-orange-600" />
                </div>
                <CardTitle>Suporte Dedicado</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Equipe de suporte pronta para ajudar. Tenha problemas? Nós resolvemos
                rapidamente para você continuar ganhando.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  const renderRequirements = () => (
    <section className="py-20 px-4 bg-muted/50">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Requisitos</h2>
          <p className="text-lg text-muted-foreground">
            Tudo que você precisa para começar
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Maior de 18 anos</p>
                  <p className="text-sm text-muted-foreground">
                    Você deve ter 18 anos ou mais
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Veículo próprio</p>
                  <p className="text-sm text-muted-foreground">
                    Bicicleta, moto, carro ou van
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Smartphone</p>
                  <p className="text-sm text-muted-foreground">
                    Com internet e GPS funcionando
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Documentos em dia</p>
                  <p className="text-sm text-muted-foreground">
                    CPF e CNH (se aplicável)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );

  const renderCTA = () => (
    <section className="py-20 px-4">
      <div className="container max-w-4xl mx-auto">
        <Card className="border-primary bg-primary/5">
          <CardContent className="pt-12 pb-12 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pronto para Começar?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a milhares de entregadores que já estão ganhando dinheiro com
              flexibilidade e autonomia. Cadastre-se gratuitamente agora!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/app/delivery/profile/setup')}
                className="text-lg"
              >
                <Truck className="mr-2 h-5 w-5" />
                Criar Perfil de Entregador
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/app/delivery/dashboard')}
                className="text-lg"
              >
                Já sou Entregador
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );

  const renderFAQ = () => (
    <section className="py-20 px-4 bg-muted/50">
      <div className="container max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Perguntas Frequentes
          </h2>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como funciona o pagamento?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Você recebe o pagamento instantaneamente em BZR após concluir cada entrega.
                O valor é creditado automaticamente na sua carteira Bazari e pode ser
                usado imediatamente ou convertido.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Preciso trabalhar em horário fixo?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Não! Você tem total flexibilidade. Trabalhe quando quiser, pelos horários
                que preferir. Basta marcar-se como disponível no app e começar a receber
                demandas.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quanto posso ganhar?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Seus ganhos dependem da quantidade de entregas que você faz e da distância
                percorrida. Em média, entregadores ativos ganham entre 500-2000 BZR por
                mês, mas o potencial é ilimitado.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Como escolho as entregas?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Você vê todas as demandas disponíveis próximas a você, com informações de
                distância, valor e destino. Você decide quais aceitar com base no que faz
                sentido para sua rota.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen">
      {renderHero()}
      {renderHowItWorks()}
      {renderBenefits()}
      {renderRequirements()}
      {renderCTA()}
      {renderFAQ()}
    </div>
  );
}
