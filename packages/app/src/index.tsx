import '@backstage/cli/asset-types';
import ReactDOM from 'react-dom/client';
import App from './App';
import '@backstage/ui/css/styles.css';
import '../../../bui-css/aperture.css';
import '../../../bui-css/dark-theme.css';

ReactDOM.createRoot(document.getElementById('root')!).render(App.createRoot());
