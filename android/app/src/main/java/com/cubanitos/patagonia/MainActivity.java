package com.cubanitos.patagonia;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(CubanitosUpdaterPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
