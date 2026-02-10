
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, XCircle } from 'lucide-react';
import client from '@/pkg/api/client';

interface ClientInfo {
    client_id: string;
    client_name: string;
    logo_url: string;
    policy_uri: string;
    tos_uri: string;
}

const ConsentPage = () => {
    const [searchParams] = useSearchParams();


    const clientId = searchParams.get('client_id');
    const scope = searchParams.get('scope') || '';
    const state = searchParams.get('state') || '';
    const nonce = searchParams.get('nonce') || '';
    const redirectUri = searchParams.get('redirect_uri') || '';

    const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!clientId) {
            setError('Missing client_id');
            setIsLoading(false);
            return;
        }

        const fetchClientInfo = async () => {
            try {
                const { data } = await client.get(`/oauth2/client-info?client_id=${clientId}`);
                setClientInfo(data);
            } catch (err: any) {
                console.error(err);
                setError('Failed to load client application details.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientInfo();
    }, [clientId]);

    const handleDecision = async (decision: 'allow' | 'deny') => {
        setIsLoading(true);
        try {
            const payload = {
                client_id: clientId,
                scope,
                state,
                nonce,
                redirect_uri: redirectUri,
                decision
            };
            const { data } = await client.post('/oauth2/consent', payload);
            if (data.redirect_to) {
                window.location.href = data.redirect_to;
            } else {
                setError('Invalid server response');
            }
        } catch (err: any) {
            console.error(err);
            setError('Failed to process consent decision.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-main-dark text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-bg-main-dark text-white">
                <div className="max-w-md w-full bg-bg-card-dark p-8 rounded border border-red-500/50">
                    <div className="flex items-center text-red-500 mb-4">
                        <XCircle className="w-8 h-8 mr-3" />
                        <h2 className="text-xl font-bold">Error</h2>
                    </div>
                    <p className="text-gray-300">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-bg-main-dark p-4 font-sans">
            <div className="max-w-lg w-full bg-bg-card-dark border border-border-color-dark rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    {clientInfo?.logo_url ? (
                        <img
                            src={clientInfo.logo_url}
                            alt={clientInfo.client_name}
                            className="w-20 h-20 mx-auto rounded-full mb-4 object-cover type-white border-2 border-border-color-dark"
                        />
                    ) : (
                        <div className="w-20 h-20 mx-auto rounded-full bg-slate-800 flex items-center justify-center mb-4 border-2 border-border-color-dark text-2xl font-bold text-gray-400">
                            {clientInfo?.client_name?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {clientInfo?.client_name || 'Application'}
                    </h1>
                    <p className="text-gray-400">
                        wants to access your account
                    </p>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-6 mb-8 border border-border-color-dark">
                    <div className="flex items-start mb-4">
                        <ShieldCheck className="w-5 h-5 text-green-400 mr-3 mt-0.5 shrink-0" />
                        <div>
                            <h3 className="text-sm font-bold text-white mb-1">Access your profile</h3>
                            <p className="text-xs text-gray-400">
                                This application will be able to read your user profile information (name, email, avatar).
                            </p>
                        </div>
                    </div>
                    {/* Parse scopes and show more items if needed */}
                </div>

                <div className="flex space-x-4">
                    <button
                        onClick={() => handleDecision('deny')}
                        className="flex-1 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded transition-colors border border-border-color-dark"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => handleDecision('allow')}
                        className="flex-1 py-3 px-4 bg-primary hover:bg-opacity-90 text-white font-bold rounded transition-colors flex items-center justify-center shadow-lg shadow-primary/20"
                    >
                        Allow Access
                    </button>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    By clicking Allow, you agree to share your data with {clientInfo?.client_name}.
                </p>
            </div>
        </div>
    );
};

export default ConsentPage;
