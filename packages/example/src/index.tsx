import { h, render, Component } from "oreact";

console.log(Component.prototype);

class App extends Component {
  state = {
    age: 19,
  };

  componentDidMount() {
    this.setState({ age: 12 });
  }

  render() {
    return h("h1", null, `${this.state.age}才`);
  }
}

render(h(App, null, null), document.body);
