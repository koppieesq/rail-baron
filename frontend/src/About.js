import {T} from './Translator';

function About() {
    return (<div className="main-content">
            <h2><T>About This Site</T></h2>
            <p><T>This is a <strong>technology demonstration</strong> to illustrate how to build a sophisticated,
                modern site using headless Drupal, React, and <strong>Kubernetes.</strong>  This site was originally built
                for <strong>Stanford Web Camp 2026</strong>; you are invited to read
                Jordan's <a href="/presentation/demystifying-kubernetes.html">slide deck</a>.  You can also view the
                original <a href="https://webcamp.stanford.edu/session/kubernetes-for-drupal-devs">session description</a>.</T></p>
            <p><T>Special thanks to <a href="https://www.avalonhill.com/worldwide">Avalon Hill</a> for many years of
                entertainment.</T></p>
            <hr/>
            <h2><T>About Us</T></h2>
            <p><T>My name is Jordan Koplowicz and I am the sole proprietor of <a href="https://koplowiczandsons.com">
                Koplowicz & Sons</a>. I have been building websites since 2005, and writing software a lot longer than
                that.</T></p>
            <p><T>I invite you to visit my professional site: <a href="https://koplowiczandsons.com">Koplowicz & Sons</a>.</T></p>
            <p><img style={{width: "100%"}} alt="Jordan Koplowicz and sons" src="Koplowicz-old.jpg"/></p>
        </div>);
}

export default About;
