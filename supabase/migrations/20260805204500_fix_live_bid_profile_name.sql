DO $$
DECLARE
    function_definition text;
BEGIN
    SELECT pg_get_functiondef('public.place_live_bid(uuid,uuid,numeric,text)'::regprocedure)
      INTO function_definition;

    function_definition := replace(
        function_definition,
        'SELECT coalesce(full_name, username, null) INTO v_user_name FROM public.profiles WHERE id = auth.uid()',
        'SELECT nullif(full_name, '''') INTO v_user_name FROM public.profiles WHERE id = auth.uid()'
    );

    IF function_definition LIKE '%username%' THEN
        RAISE EXCEPTION 'Não foi possível remover a referência inválida a profiles.username';
    END IF;

    EXECUTE function_definition;
END;
$$;
