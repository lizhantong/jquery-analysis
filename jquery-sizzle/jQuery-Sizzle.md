# jquery设计思想：选择某个网页元素，然后对其进行某种操作

## jquery 源码架构

    (function(window, undefined) {
        var jQuery = function( selector, context ) {
            return new jQuery.fn.init( selector, context );
        };
        jQuery.fn = jQuery.prototype = {};
        // 定义了一些变量和函数   (21-94行)
        // 给JQ对象添加了方法和属性    (96-283行)

        // extend方法(285-347行)
        // 核心方法     extend({}) (349-817行)

        // 选择器引擎   Sizzle (876-2845行)

        // 回调系统     Callbacks (2880-3042行)
        // 异步队列     Deferred (3043-3183)
        // 数据缓存     Data (3308-3652)
        // 队列操作     quene (3653-3797)
        // 属性操作     元素属性的操作：attr()  prop() val() addClass()等(3803-4299)
        // 事件体系     on() trigger(),事件操作的相关方法 (4300-5128行)
        // 文档处理     DOM操作行,添加、删除、获取、包装(5140-6057行)
        // 样式操作     css()(6058-6620行)
        // AJAX交互   提交的数据和ajax() load() getJson() getScript()(6621-7854)
        // 动画引擎     animate:运动的方法 (7855-8584)
        //             offset:位置和尺寸的方法 (8585-8792)

        // JQ支持模块化的模式(8804-8821)
        return jQuery;
    })(window);


## 选择器的引擎--Sizzle
    jQuery中选择器使用的是Sizzle；
    在jQuery中行数：876-2845行；
    Sizzle看可以单独下载去使用；

### 选择器基本介绍

#### 基本的浏览器提供的接口
    document.getElementById()
    document.getElementsByName()
    document.getElementsByTagName()

#### 高级浏览器提供的接口
    document.getElementsByClassName()
    document.querySelector()
    document.querySelectorAll()

结论：由低级浏览器并未提供高级浏览器这些接口，所以才有了Sizzle这个选择器引擎；Sizzle引擎提供的接口跟document.querySelectorAll是一样的。

#### 常见的选择器
    #test表示id为test的DOM节点
    .test表示class为test的DOM节点
    input表示节点名为input的DOM节点
    div > p表示div底下的p的DOM节点
    div + p表示div的兄弟DOM节点p
    ......



### Sizzle解析机制-词法解析

    输入的是一串选择器字符串，输出则一个符合这个选择器规则的DOM借点列表，第一步，要分析的便是这个输入的选择器；
    先看例子：example1
    window.onload = function() {
        console.log(Sizzle('div > div.sizzle p span.red'));
        console.log(document.querySelectorAll('div > div.sizzle p span.red'));
    }
    输出的结果是一样的；
    问题：引擎解析CSS选择器时，从左往右，还是从右往左解析？
    接下来先看看css解析机制。。。

#### css解析机制
    Html解析，生成两棵树:Dom Tree(这个咱们都很熟悉), Render Tree(Css在解析完毕后，需要将解析的结果与Dom Tree的内容一起进行分析建立一颗Render Tree)；Render Tree中的元素（Webkits 中称为[renderers]), FireFox下为[iframes])与Dom元素相对应；注意：但是并非一一对应，一个Dom元素会对应多个renderer,如文本折行后，不同的行会成为Render Tree中不同的renderer。也有的Dom元素被Render Tree完全无视，比如display:none的元素。
    在建立Render Tree时(WebKit中的[Attachment]过程)，浏览器就要为每个Dom Tree中的元素根据CSS的解析结果(Style Rules)来确定生成怎样的renderer；
    对于每个Dom元素，必须在所有 Style Rules 中找到符合的 selector 并将对应的规则进行合并；选择器的「解析」实际是在这里执行的，在遍历 DOM Tree 时，从 Style Rules 中去寻找对应的 selector。
    因为所有样式规则可能数量很大，而且绝大多数不会匹配到当前的 Dom 元素（因为数量很大所以一般会建立规则索引树），所以有一个快速的方法来判断「这个 selector 不匹配当前元素」就是极其重要的.
    如果正向解析，例如「div div p em」，我们首先就要检查当前元素到 html 的整条路径，找到最上层的 div，再往下找，如果遇到不匹配就必须回到最上层那个 div，往下再去匹配选择器中的第一个 div，回溯若干次才能确定匹配与否，效率很低
    逆向匹配则不同，先匹配到最右边的元素，向上找父节点进行验证
    但因为匹配的情况远远低于不匹配的情况，所以逆向匹配带来的优势是巨大的。同时我们也能够看出，在选择器结尾加上「*」就大大降低了这种优势，这也就是很多优化原则提到的尽量避免在选择器末尾添加通配符的原因。

回过头，接着说Sizzle选择器。。。

#### Sizzle选择器，右-左解析

##### 从左到右解析
    选择器：div > div.sizzle p span.red
    先找到所有div节点
    第一个div节点内找到所有的子div,并且是class=”sizzle”
    然后再一次匹配p span.red等情况
    遇到不匹配的情况，就必须回溯到一开始搜索的div或者p节点，然后去搜索下个节点，重复这样的过程。
    这样的搜索过程对于一个只是匹配很少节点的选择器来说，效率是极低的，因为我们花费了大量的时间在回溯匹配不符合规则的节点。
    换个思路，我们一开始过滤出跟目标节点最符合的集合出来，再在这个集合进行搜索，大大降低了搜索空间。。。

##### 从右到左来解析
    首先就查找到<span class='red'>的元素。
    firefox称这种查找方式为key selector(关键字查询)，所谓的关键字就是样式规则中最后(最右边)的规则，上面的key就是span.red。
    紧接着我们判断这些节点中的前兄弟节点是否符合p这个规则，这样就又减少了集合的元素，只有符合当前的子规则才会匹配再上一条子规则
    要知道DOM树是一个什么样的结构，一个元素可能有若干子元素，如果每一个都去判断一下显然性能太差。
    而一个子元素只有一个父元素，所以找起来非常方便。

结论：比如 p span.showing 你认为从一个p元素下面找到所有的span元素并判断是否有class showing快，还是找到所有的span元素判断是否有class showing并且包括一个p父元素快 ？

#### Sizzle Token介绍

##### js解析机制--词法解析
    javascript而言，解析过程可以分为：预编译，执行两个阶段；
    在预编译的时候通过词法分析器与语法分期器的规则处理
    在词法分析过程中，js解析器要下把脚本代码的字符流转换成记号流
    a　=　b　-　c;
    NAME "a"
    EQUALS
    OPEN_PARENTHESIS
    NAME "b"
    MINUS
    NAME "c"
    CLOSE_PARENTHESIS
    SEMICOLON
    把代码解析成Token的阶段在编译阶段里边称为词法分析
    代码经过词法分析后就得到了一个Token序列，紧接着拿Token序列去其他事情

##### Sizzle用的简单的词法分析
    Css选择器其实也就是一段字符串，我们需要分析出这个字符串背后对应的规则，在Sizzle中专门有一个tokenize处理器干这个事情；
    Token：{
        value:'匹配到的字符串',
        type:'对应的Token类型',
        matches:'正则匹配到的一个结构'
    }
    这个Token结构被拿到后，接下去去做别的事儿...
    请看example2，是一个token处理事务的例子；

#### 使用Sizzle Token简单解析
    参照example3，以及token.js，进行分析
    解析的规则：div > p + div.lzt input[type="checkbox"], div > p
    groups收集并联关系的处理，把解析规则分解为：
    [
        0:div > p + div.lzt input[type="checkbox"],
        1:div > p
    ]
    先  处理这几个简单的特殊的Token: >, +, 空格, ~
    再  处理这几种token(将每个选择器组依次用ID,TAG,CLASS,ATTR,CHILD,PSEUDO这些正则进行匹配);
    再  将每个选择器组依次用ID,TAG,CLASS,ATTR,CHILD,PSEUDO这些正则进行匹配
    最后 放到tokenCache函数里进行缓存

#### 使用Sizzle Token深入解析1
    如上解析示例：解析的规则：div > p + div.lzt input[type="checkbox"], div>p
    大概意思：
        <div> 元素的所有子元素 <p> 元素；
        选择紧接在 <p> 元素之后的所有 <div> 并且class="lzt" 的所有元素；
        之后选择 div.lzt 元素内部的所有 input并且带有 type="checkbox" 的元素

    需要用到知识点：
        CSS选择器的位置关系；
        CSS的浏览器实现的基本接口；
        CSS选择器从右到左扫描匹配

    文档中所有节点都存在一定的关系：example4
        祖宗和后代：爷爷grandfather与孙子child1属于祖宗与后代关系（空格表达）

        父亲和儿子：父亲father与儿子child1属于父子关系（>表达）

        临近兄弟：哥哥child1与弟弟child2属于临近兄弟关系（+表达）

        普通兄弟：哥哥child1与弟弟child2,弟弟child3都属于普通兄弟关系（~表达）

    在Sizzle里有一个对象是记录跟选择器相关的属性以及操作：Expr。它有以下属性：
        relative = {
          ">": { dir: "parentNode", first: true },
          " ": { dir: "parentNode" },
          "+": { dir: "previousSibling", first: true },
          "~": { dir: "previousSibling" }
        }
    所以在Expr.relative里边定义了一个first属性，用来标识两个节点的“紧密”程度，例如父子关系和临近兄弟关系就是紧密的。在创建位置匹配器时，会根据first属性来匹配合适的节点。

    HTML文档一共有这么四个API：
        getElementById，上下文只能是HTML文档。
        getElementsByName，上下文只能是HTML文档。
        getElementsByTagName，上下文可以是HTML文档，XML文档及元素节点。
        getElementsByClassName，上下文可以是HTML文档及元素节点。IE8还没有支持。

    在Sizzle最终只会有3种,使用原dom操作接口
        Expr.find = {
            'ID'    : context.getElementById,
            'CLASS' : context.getElementsByClassName,
            'TAG'   : context.getElementsByTagName
        }

#### 使用Sizzle Token深入解析2
    参照：example5  token.js   select.js
    第一步：选择器语句 div > p + div.lzt input[type="checkbox"]
    第二步：开始通过词法分析器tokenize分解对应的规则，分解为9个块：
        分解每一个小块
        type: "TAG"
        value: "div"
        matches ....

        type: ">"
        value: " > "

        type: "TAG"
        value: "p"
        matches ....

        type: "+"
        value: " + "

        type: "TAG"
        value: "div"
        matches ....

        type: "CLASS"
        value: ".aaron"
        matches ....

        type: " "
        value: " "

        type: "TAG"
        value: "input"
        matches ....

        type: "ATTR"
        value: "[type="checkbox"]"
        matches ....


        除去关系选择器，其余的有语意的标签都对应分析出了对应的matches
        例如： 最后一个属性选择器分支
        "[type="checkbox"]"
        {
            matches = [
               0: "type"
               1: "="
               2: "checkbox"
            ]
            type: "ATTR"
            value: "[type="checkbox"]"
        ｝

    第三步：从右往左依次匹配(select)
        最终还是通过浏览器提供的API实现的， 所以Expr.find就是最终的实现接口;
        先匹配最右边的ATTR（[type="checkbox"]）,Expr.find不认识，就接着往左匹配；如果碰到 关系符（> + 空格 ~),跳过，也是接着往左匹配；直到匹配到ID,CLASS,TAG  中一种 , 因为这样才能通过浏览器的接口索取；
        再接着往左匹配，匹配到TAG；
        Expr.find["TAG"] = support.getElementsByTagName ?
            function(tag, context) {
               if ( typeof context.getElementsByTagName !== "undefined" ) {
                    return context.getElementsByTagName( tag );
                } else if ( support.qsa ) {
                    return context.querySelectorAll( tag );
                }
        };
        但是getElementsByTagName方法返回的是一个合集，
        这里引入了seed - 种子合集（搜索器搜到符合条件的标签），放入到这个初始集合seed中；元素为搜索到的两个input

    第四步：重整选择器
        此时选择器，剩下了  div > p + div.lzt [type="checkbox"]，等选择器为空了，就返回结果；
        能使用的东西
            seed集合:两个input
            通过tokenize分析解析规则组成match合集 本来9个，变8个了
            选择器语句，踢掉了 input
    此时，范围已经缩小了，接下来，从seed中迅速找到目标呢
    待续。。。


### Sizzle解析机制--编译

### Sizzle解析机制--超级匹配

