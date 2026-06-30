import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'
import { handleAIGatewayHttpRequest } from '../_shared/ai/edge-http.ts'
import { handleAIGatewayRequest } from '../_shared/ai/runtime.ts'

Deno.serve(async (request: Request) => {
  return handleAIGatewayHttpRequest({
    request,
    env: Deno.env.toObject(),
    createClient,
    runtimeHandler: handleAIGatewayRequest,
  })
})
