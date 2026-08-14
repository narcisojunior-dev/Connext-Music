# Roteiro de testes em aparelho real

A suíte automatizada cobre lógica pura, stores e persistência (`npm test`). O que **não** cobre é
tudo que depende do hardware, do sistema operacional ou de um dedo na tela — e é justamente aí que
apareceram os dois piores bugs deste projeto:

- O Now Playing da tela de bloqueio nunca funcionou até a #12 (opções de sessão de áudio inválidas
  que o simulador aceitava em silêncio, corrigido em `6e1e244`).
- O botão da fila de reprodução passou nove issues sem fazer nada, porque renderizava e respondia
  ao toque normalmente (`f7e4157`).

Este arquivo é o roteiro. Marque o resultado e a data ao rodar.

## Antes de começar

```bash
npx expo prebuild -p ios --clean
npx expo run:ios --device
```

Módulos nativos acumulados até aqui exigem recompilação, não bastam fast refresh: Track Player,
Document Picker, Keep Awake, Screen Orientation, o widget (App Group) e o Glass Effect.

Coloque pelo menos 20 músicas com **capa embutida** e **tags completas**, e pelo menos uma sem tag
nenhuma — o comportamento de fallback só aparece com ela.

---

## 1. Reprodução em segundo plano e tela de bloqueio

| #   | Passo                                   | Esperado                                            | OK? |
| --- | --------------------------------------- | --------------------------------------------------- | --- |
| 1.1 | Tocar uma faixa e bloquear a tela       | Título, artista e capa aparecem na tela de bloqueio |     |
| 1.2 | Play/pause pela tela de bloqueio        | Responde imediatamente                              |     |
| 1.3 | Botões de faixa pela tela de bloqueio   | Troca de música; **não** aparecem botões de ±10s    |     |
| 1.4 | Arrastar a barra na tela de bloqueio    | A posição muda de verdade                           |     |
| 1.5 | Sair do app pela tela de início         | A música continua                                   |     |
| 1.6 | Deixar a faixa acabar com o app fechado | A próxima começa sozinha                            |     |
| 1.7 | Central de Controle                     | Mesmos controles funcionam                          |     |

> ⚠️ Este bloco é o que falhou silenciosamente até a #12. Se algo aqui não aparecer, o problema
> provavelmente está na configuração da sessão de áudio, em `playback-service.ts`.

## 2. Controles físicos

| #   | Passo                      | Esperado                                | OK? |
| --- | -------------------------- | --------------------------------------- | --- |
| 2.1 | Play/pause no fone com fio | Alterna                                 |     |
| 2.2 | Duplo toque no AirPods     | Próxima faixa                           |     |
| 2.3 | Desconectar o fone tocando | **Pausa**, não continua no alto-falante |     |
| 2.4 | Reconectar o fone          | **Não** retoma sozinho                  |     |

## 3. Toque e gestos

| #   | Passo                                | Esperado                    | OK? |
| --- | ------------------------------------ | --------------------------- | --- |
| 3.1 | Arrastar o slider de progresso       | Acompanha o dedo sem travar |     |
| 3.2 | Mini player: arrastar na horizontal  | Pula faixa                  |     |
| 3.3 | Mini player: arrastar para baixo     | Encerra a reprodução        |     |
| 3.4 | Segurar uma faixa na lista           | Abre a folha de ações       |     |
| 3.5 | Arrastar para reordenar uma playlist | A ordem persiste ao voltar  |     |
| 3.6 | Ícone de lista no player             | Abre a fila                 |     |
| 3.7 | Segurar uma faixa na fila            | Reordena                    |     |

## 4. Retorno tátil

Por intenção, não por intensidade (ver `utils/haptics.ts`):

| #   | Ação                                  | Esperado                                   | OK? |
| --- | ------------------------------------- | ------------------------------------------ | --- |
| 4.1 | Play/pause, próxima, anterior, saltos | Toque **leve**                             |     |
| 4.2 | Favoritar                             | Toque **médio**, mais firme que o anterior |     |
| 4.3 | Segurar uma faixa                     | Toque **forte**                            |     |
| 4.4 | Desfavoritar                          | Leve — a animação de "like" não se repete  |     |

## 5. Áudio

| #   | Passo                                                         | Esperado                                   | OK? |
| --- | ------------------------------------------------------------- | ------------------------------------------ | --- |
| 5.1 | Ligar "Fade entre faixas" e deixar uma faixa acabar           | O volume desce no fim e volta na seguinte  |     |
| 5.2 | Ligar "Normalizar volume" com um arquivo que tenha ReplayGain | O volume muda                              |     |
| 5.3 | Sleep timer de 5 min                                          | Pausa sozinho, com o volume descendo antes |     |
| 5.4 | Sleep timer "fim da faixa"                                    | Pausa ao acabar a faixa atual              |     |
| 5.5 | Cancelar um timer ativo                                       | O selo some do player                      |     |

## 6. Importação e arquivos

| #   | Passo                                                           | Esperado                                               | OK? |
| --- | --------------------------------------------------------------- | ------------------------------------------------------ | --- |
| 6.1 | Finder → Arquivos → arrastar músicas                            | Aparecem após "Reescanear biblioteca"                  |     |
| 6.2 | "Importar músicas" → escolher do iCloud Drive                   | Copia e aparece na biblioteca                          |     |
| 6.3 | Importar um arquivo não suportado                               | Recusado com mensagem clara                            |     |
| 6.4 | Importar duas vezes o mesmo arquivo                             | Não duplica                                            |     |
| 6.5 | Apagar um arquivo pelo app Arquivos → "Excluir não encontradas" | Remove só as que sumiram                               |     |
| 6.6 | Long-press → "Remover da biblioteca" → reescanear               | A faixa **volta**                                      |     |
| 6.7 | Long-press → "Apagar do aparelho" → reescanear                  | A faixa **não volta**; o arquivo sumiu do app Arquivos |     |
| 6.8 | Aba Pastas → "Importar pasta" com a biblioteca já cheia         | O botão está no topo da aba; nomear a pasta a separa   |     |
| 6.8 | Apagar a faixa que está tocando                                 | A reprodução para, sem travar                          |     |

## 7. Compartilhar playlists

| #   | Passo                                    | Esperado                                           | OK? |
| --- | ---------------------------------------- | -------------------------------------------------- | --- |
| 7.1 | Playlist → Compartilhar                  | Abre a folha do iOS com um `.connextplaylist.json` |     |
| 7.2 | Enviar para si mesmo e importar          | A playlist volta com as faixas que existem         |     |
| 7.3 | Importar num aparelho sem algumas faixas | Diz **quais** faltam                               |     |
| 7.4 | Importar um JSON qualquer                | "Não é uma playlist do Connext Music"              |     |

## 8. Widget e Siri

| #   | Passo                                                | Esperado                                   | OK? |
| --- | ---------------------------------------------------- | ------------------------------------------ | --- |
| 8.1 | Adicionar o widget pequeno                           | Mostra a faixa atual                       |     |
| 8.2 | Adicionar o widget médio                             | Mostra capa, título, artista e botões      |     |
| 8.3 | Trocar de faixa no app                               | O widget atualiza                          |     |
| 8.4 | Tocar num botão do widget                            | Abre o app e executa                       |     |
| 8.5 | App Atalhos → buscar "Connext"                       | Os três atalhos aparecem                   |     |
| 8.6 | "E aí Siri, tocar música aleatória no Connext Music" | Abre e toca                                |     |
| 8.7 | "…tocar playlist [nome]"                             | O Siri oferece os nomes das suas playlists |     |

## 9. Modo carro

| #   | Passo                              | Esperado                                        | OK? |
| --- | ---------------------------------- | ----------------------------------------------- | --- |
| 9.1 | Abrir o modo carro                 | Fundo preto, botões grandes                     |     |
| 9.2 | Ler a tela a um braço de distância | Legível                                         |     |
| 9.3 | Deitar o aparelho                  | Vira paisagem, capa ao lado dos controles       |     |
| 9.4 | Esperar parado 2 minutos           | **A tela não bloqueia**                         |     |
| 9.5 | Sair do modo carro                 | Volta a retrato e o auto-lock volta a funcionar |     |

> 9.3 é o item mais provável de ter problema: o modo paisagem nunca foi visto rodando.

## 10. Aparência

| #    | Passo                    | Esperado                                                     | OK? |
| ---- | ------------------------ | ------------------------------------------------------------ | --- |
| 10.1 | Rolar a Biblioteca       | A tab bar refrata a lista atrás dela (Liquid Glass, iOS 26+) |     |
| 10.2 | Player com capa colorida | Os botões de transporte mostram o vidro                      |     |
| 10.3 | Título longo no player   | Desliza (marquee) e volta                                    |     |
| 10.4 | Trocar de faixa          | A capa faz crossfade, o gradiente acompanha                  |     |

> 10.2 ficou fraco no simulador — os controles ficam sobre área quase preta e há pouco para
> refratar. É o item que mais pode diferir no aparelho.

## 11. Esforço

| #    | Passo                                                      | Esperado                                 | OK? |
| ---- | ---------------------------------------------------------- | ---------------------------------------- | --- |
| 11.1 | Biblioteca com 1000+ faixas: rolar rápido de ponta a ponta | Sem engasgo perceptível                  |     |
| 11.2 | Trocar de faixa 50 vezes seguidas, rápido                  | Sem travar, sem áudio sobreposto         |     |
| 11.3 | Reescanear com 1000+ arquivos                              | Barra de progresso se move; app responde |     |
| 11.4 | Modo avião ligado                                          | Tudo funciona — o app é totalmente local |     |
| 11.5 | Deixar tocando 1 hora em segundo plano                     | Sem queda de memória nem parada          |     |

> No simulador, com 1120 faixas: hidratação 78ms, scan completo 2133ms, scan incremental 965ms.
> Serve de referência — o aparelho tende a ser mais lento que o Mac.

---

## Registro de execução

| Data | Aparelho / iOS | Blocos rodados | Resultado |
| ---- | -------------- | -------------- | --------- |
|      |                |                |           |
